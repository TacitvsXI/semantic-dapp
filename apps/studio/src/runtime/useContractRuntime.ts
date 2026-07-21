import { useCallback, useMemo, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain, useWalletClient } from 'wagmi';
import type { Abi, Address, EIP1193Provider } from 'viem';
import type { ContractFunction } from '@semantic-dapp/spec';
import {
  createReadClientFor,
  decodeExecutionError,
  estimateWriteGas,
  explorerUrlForChain,
  idleTxState,
  readAndFormat,
  simulateWrite,
  waitForTx,
  type FormattedOutput,
  type TxState,
} from '@semantic-dapp/execution';
import type { ContractRuntime } from '@semantic-dapp/renderer';
import { pushToast } from '@semantic-dapp/components';
import type { Project } from '../state/project.js';

/** A terminal write result reported for the audit trail. */
export interface WriteRecord {
  function: string;
  status: 'success' | 'error';
  hash?: string;
  chainId?: number;
  detail?: string;
}

export interface RuntimeHooks {
  /** Called once a write reaches a terminal (success/error) state. */
  onWrite?: (record: WriteRecord) => void;
}

export function useContractRuntime(project: Project, hooks?: RuntimeHooks): ContractRuntime {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  // Reads go over the configured HTTP RPC, but fall back to the connected
  // wallet's provider when it's on the contract's chain — so a connected user
  // can still read even if the public RPC is missing/rate-limited/CORS-blocked.
  const publicClient = useMemo(() => {
    const onContractChain = isConnected && chainId === project.contract.chainId;
    const provider =
      onContractChain && walletClient ? (walletClient as unknown as EIP1193Provider) : undefined;
    return createReadClientFor(
      {
        chainId: project.contract.chainId,
        rpcUrl: project.rpcUrl,
        name: project.contract.name ?? project.name,
      },
      provider,
    );
  }, [
    project.contract.chainId,
    project.rpcUrl,
    project.contract.name,
    project.name,
    walletClient,
    isConnected,
    chainId,
  ]);

  const [txStates, setTxStates] = useState<Record<string, TxState>>({});
  const setTx = useCallback((signature: string, state: TxState) => {
    setTxStates((prev) => ({ ...prev, [signature]: state }));
  }, []);

  // Keep the latest recorder without re-creating submitWrite on every render.
  const onWriteRef = useRef(hooks?.onWrite);
  onWriteRef.current = hooks?.onWrite;
  const contractChainId = project.contract.chainId;
  const record = useCallback(
    (rec: { function: string; status: 'success' | 'error'; hash?: string; detail?: string }) => {
      onWriteRef.current?.({ ...rec, chainId: contractChainId });
    },
    [contractChainId],
  );

  const abi = project.abi as Abi;
  const target = project.contract.address as Address | undefined;
  const explorerUrl = explorerUrlForChain(project.contract.chainId);

  const callRead = useCallback(
    async (func: ContractFunction, args: unknown[]): Promise<FormattedOutput[]> => {
      if (!target) throw new Error('Set a contract address to call functions.');
      return readAndFormat(
        publicClient,
        { address: target, abi, functionName: func.name, args },
        func.outputs,
      );
    },
    [publicClient, abi, target],
  );

  const submitWrite = useCallback(
    async (func: ContractFunction, args: unknown[], value?: bigint): Promise<void> => {
      const sig = func.signature;
      if (!target) {
        setTx(sig, {
          phase: 'error',
          error: {
            kind: 'unknown',
            title: 'No contract address',
            detail: 'Set a contract address first.',
          },
        });
        return;
      }
      if (!walletClient || !address) {
        setTx(sig, {
          phase: 'error',
          error: {
            kind: 'unknown',
            title: 'Wallet not connected',
            detail: 'Connect a wallet to send transactions.',
          },
        });
        return;
      }
      try {
        setTx(sig, { phase: 'simulating' });
        const sim = await simulateWrite(publicClient, {
          address: target,
          abi,
          functionName: func.name,
          args,
          account: address,
          ...(value !== undefined ? { value } : {}),
        });

        let gasEstimate: bigint | undefined;
        try {
          setTx(sig, { phase: 'estimating' });
          gasEstimate = await estimateWriteGas(publicClient, {
            address: target,
            abi,
            functionName: func.name,
            args,
            account: address,
            ...(value !== undefined ? { value } : {}),
          });
        } catch {
          gasEstimate = undefined;
        }

        setTx(sig, { phase: 'awaiting-signature', gasEstimate });
        const hash = await walletClient.writeContract(sim.request);
        setTx(sig, { phase: 'pending', hash, gasEstimate });
        const txHref = explorerUrl ? `${explorerUrl}/tx/${hash}` : undefined;
        pushToast({
          id: `tx-${sig}`,
          kind: 'info',
          title: 'Transaction submitted',
          message: func.name,
          ...(txHref ? { href: txHref, hrefLabel: 'View on explorer' } : {}),
        });

        const receipt = await waitForTx(publicClient, hash);
        const ok = receipt.status === 'success';
        setTx(sig, {
          phase: ok ? 'success' : 'error',
          hash,
          gasEstimate,
          ...(ok
            ? {}
            : {
                error: {
                  kind: 'revert' as const,
                  title: 'Transaction failed',
                  detail: 'The transaction was reverted on-chain.',
                },
              }),
        });
        pushToast({
          id: `tx-${sig}`,
          kind: ok ? 'success' : 'error',
          title: ok ? 'Transaction confirmed' : 'Transaction failed',
          message: ok ? func.name : `${func.name} reverted on-chain`,
          ...(txHref ? { href: txHref, hrefLabel: 'View on explorer' } : {}),
        });
        record({
          function: sig,
          status: ok ? 'success' : 'error',
          hash,
          ...(ok ? {} : { detail: 'Reverted on-chain' }),
        });
      } catch (error) {
        const decoded = decodeExecutionError(error);
        setTx(sig, { phase: 'error', error: decoded });
        pushToast({
          id: `tx-${sig}`,
          kind: 'error',
          title: 'Transaction failed',
          message: `${func.name}: ${decoded.title}`,
        });
        record({ function: sig, status: 'error', detail: `${decoded.title}: ${decoded.detail}` });
      }
    },
    [publicClient, abi, target, walletClient, address, setTx, record, explorerUrl],
  );

  const getTxState = useCallback(
    (signature: string): TxState => txStates[signature] ?? idleTxState,
    [txStates],
  );

  const connectWallet = useCallback(() => {
    const injectedConnector = connectors.find((c) => c.type === 'injected') ?? connectors[0];
    if (injectedConnector) connect({ connector: injectedConnector });
  }, [connect, connectors]);

  return {
    wallet: {
      isConnected,
      ...(address ? { address } : {}),
      ...(chainId !== undefined ? { chainId } : {}),
      connect: connectWallet,
      disconnect: () => disconnect(),
      switchChain: () => switchChain({ chainId: project.contract.chainId }),
    },
    callRead,
    submitWrite,
    getTxState,
    ...(explorerUrl ? { explorerUrl } : {}),
  };
}

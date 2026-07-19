import { useCallback, useMemo, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useWalletClient } from 'wagmi';
import type { Abi, Address } from 'viem';
import type { ContractFunction } from '@semantic-dapp/spec';
import {
  createPublicClientFor,
  decodeExecutionError,
  estimateWriteGas,
  idleTxState,
  readAndFormat,
  simulateWrite,
  waitForTx,
  type FormattedOutput,
  type TxState,
} from '@semantic-dapp/execution';
import type { ContractRuntime } from '@semantic-dapp/renderer';
import type { Project } from '../state/project.js';

export function useContractRuntime(project: Project): ContractRuntime {
  const publicClient = useMemo(
    () =>
      createPublicClientFor({
        chainId: project.contract.chainId,
        rpcUrl: project.rpcUrl,
        name: project.contract.name ?? project.name,
      }),
    [project.contract.chainId, project.rpcUrl, project.contract.name, project.name],
  );

  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();

  const [txStates, setTxStates] = useState<Record<string, TxState>>({});
  const setTx = useCallback((signature: string, state: TxState) => {
    setTxStates((prev) => ({ ...prev, [signature]: state }));
  }, []);

  const abi = project.abi as Abi;
  const target = project.contract.address as Address | undefined;

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

        const receipt = await waitForTx(publicClient, hash);
        setTx(sig, {
          phase: receipt.status === 'success' ? 'success' : 'error',
          hash,
          gasEstimate,
          ...(receipt.status === 'success'
            ? {}
            : {
                error: {
                  kind: 'revert' as const,
                  title: 'Transaction failed',
                  detail: 'The transaction was reverted on-chain.',
                },
              }),
        });
      } catch (error) {
        setTx(sig, { phase: 'error', error: decodeExecutionError(error) });
      }
    },
    [publicClient, abi, target, walletClient, address, setTx],
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
    },
    callRead,
    submitWrite,
    getTxState,
  };
}

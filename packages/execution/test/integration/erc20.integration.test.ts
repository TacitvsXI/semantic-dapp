import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, execSync, type ChildProcess } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  getAddress,
  type Address,
  type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { normalizeAbi } from '@semantic-dapp/spec';
import {
  defineChainFromConfig,
  readContractFunction,
  simulateWrite,
  estimateWriteGas,
  waitForTx,
  decodeExecutionError,
  formatReadResult,
} from '../../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, '../../../../contracts/fixtures');

// Anvil default account #0.
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const RPC_PORT = 8577;
const RPC_URL = `http://127.0.0.1:${RPC_PORT}`;
const CHAIN_ID = 31337;

function hasBinary(bin: string): boolean {
  try {
    execSync(`command -v ${bin}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const toolingAvailable = hasBinary('anvil') && hasBinary('forge');

function loadArtifact(): { abi: unknown[]; bytecode: `0x${string}` } {
  if (!existsSync(resolve(fixturesDir, 'lib/forge-std'))) {
    execSync('forge install foundry-rs/forge-std --no-git', { cwd: fixturesDir, stdio: 'ignore' });
  }
  execSync('forge build', { cwd: fixturesDir, stdio: 'ignore' });
  const artifactPath = resolve(fixturesDir, 'out/MockERC20.sol/MockERC20.json');
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as {
    abi: unknown[];
    bytecode: { object: `0x${string}` };
  };
  return { abi: artifact.abi, bytecode: artifact.bytecode.object };
}

async function waitForAnvil(url: string, tries = 50): Promise<void> {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
      });
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Anvil did not become ready in time');
}

describe.skipIf(!toolingAvailable)('ERC-20 read/write against Anvil', () => {
  let anvil: ChildProcess;
  let tokenAddress: Address;
  const account = privateKeyToAccount(PRIVATE_KEY);
  const chain = defineChainFromConfig({ chainId: CHAIN_ID, rpcUrl: RPC_URL, name: 'Anvil' });
  const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain, transport: http(RPC_URL) });

  let abi: readonly unknown[];

  beforeAll(async () => {
    const artifact = loadArtifact();
    abi = artifact.abi;
    anvil = spawn('anvil', ['--port', String(RPC_PORT), '--silent'], { stdio: 'ignore' });
    await waitForAnvil(RPC_URL);

    const deployHash = await walletClient.deployContract({
      abi: artifact.abi as never,
      bytecode: artifact.bytecode,
      args: ['Fixture Token', 'FIX', 18],
    });
    const receipt = await waitForTx(publicClient, deployHash);
    tokenAddress = getAddress(receipt.contractAddress!);

    // Mint an initial supply to the deployer.
    const mintSim = await simulateWrite(publicClient, {
      address: tokenAddress,
      abi: abi as never,
      functionName: 'mint',
      args: [account.address, parseEther('1000000')],
      account: account.address,
    });
    const mintHash = await walletClient.writeContract(mintSim.request);
    await waitForTx(publicClient, mintHash);
  }, 60_000);

  afterAll(() => {
    anvil?.kill('SIGKILL');
  });

  it('reads token metadata and formats it', async () => {
    const name = await readContractFunction(publicClient, {
      address: tokenAddress,
      abi: abi as never,
      functionName: 'name',
    });
    const decimals = await readContractFunction(publicClient, {
      address: tokenAddress,
      abi: abi as never,
      functionName: 'decimals',
    });
    expect(name).toBe('Fixture Token');
    expect(decimals).toBe(18);

    const model = normalizeAbi(abi as never);
    const balanceOf = model.functions.find((f) => f.name === 'balanceOf');
    const raw = await readContractFunction(publicClient, {
      address: tokenAddress,
      abi: abi as never,
      functionName: 'balanceOf',
      args: [account.address],
    });
    const formatted = formatReadResult(balanceOf!.outputs, raw);
    expect(formatted[0]?.value).toBe(parseEther('1000000').toString());
  });

  it('simulates, estimates gas, writes a transfer and confirms', async () => {
    const recipient = getAddress('0x0000000000000000000000000000000000000123');

    const sim = await simulateWrite(publicClient, {
      address: tokenAddress,
      abi: abi as never,
      functionName: 'transfer',
      args: [recipient, parseEther('10')],
      account: account.address,
    });
    const gas = await estimateWriteGas(publicClient, {
      address: tokenAddress,
      abi: abi as never,
      functionName: 'transfer',
      args: [recipient, parseEther('10')],
      account: account.address,
    });
    expect(gas).toBeGreaterThan(0n);

    const hash: Hash = await walletClient.writeContract(sim.request);
    const receipt = await waitForTx(publicClient, hash);
    expect(receipt.status).toBe('success');

    const balance = await readContractFunction(publicClient, {
      address: tokenAddress,
      abi: abi as never,
      functionName: 'balanceOf',
      args: [recipient],
    });
    expect(balance).toBe(parseEther('10'));
  });

  it('decodes a custom error on a reverting transfer', async () => {
    const poorAccount = privateKeyToAccount(
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    );
    try {
      await simulateWrite(publicClient, {
        address: tokenAddress,
        abi: abi as never,
        functionName: 'transfer',
        args: [account.address, parseEther('1')],
        account: poorAccount.address,
      });
      throw new Error('expected simulation to revert');
    } catch (error) {
      const decoded = decodeExecutionError(error);
      expect(decoded.kind).toBe('custom-error');
      expect(decoded.errorName).toBe('ERC20InsufficientBalance');
    }
  });
});

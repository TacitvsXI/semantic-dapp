import { describe, it, expect, vi } from 'vitest';
import { BaseError, ContractFunctionRevertedError, type Abi, type PublicClient } from 'viem';
import { previewWrite } from './write.js';

const abi = [
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const satisfies Abi;

const TO = '0x1111111111111111111111111111111111111111';
const RECIPIENT = '0x2222222222222222222222222222222222222222';
const ACCOUNT = '0x3333333333333333333333333333333333333333';

describe('previewWrite', () => {
  it('encodes calldata and reports success + gas on a passing dry-run', async () => {
    const client = {
      getBlockNumber: vi.fn().mockResolvedValue(123n),
      simulateContract: vi.fn().mockResolvedValue({ request: {} }),
      estimateContractGas: vi.fn().mockResolvedValue(21000n),
    } as unknown as PublicClient;

    const preview = await previewWrite(client, {
      address: TO,
      abi,
      functionName: 'transfer',
      args: [RECIPIENT, 5n],
      account: ACCOUNT,
    });

    expect(preview.success).toBe(true);
    expect(preview.to).toBe(TO);
    expect(preview.functionName).toBe('transfer');
    expect(preview.gasEstimate).toBe(21000n);
    // Function selector for transfer(address,uint256).
    expect(preview.calldata.startsWith('0xa9059cbb')).toBe(true);
    expect(preview.simulationBlock).toBe(123n);
    expect(preview.error).toBeUndefined();
  });

  it('still returns calldata + success when gas estimation fails', async () => {
    const client = {
      getBlockNumber: vi.fn().mockResolvedValue(1n),
      simulateContract: vi.fn().mockResolvedValue({ request: {} }),
      estimateContractGas: vi.fn().mockRejectedValue(new Error('no gas')),
    } as unknown as PublicClient;

    const preview = await previewWrite(client, {
      address: TO,
      abi,
      functionName: 'transfer',
      args: [RECIPIENT, 5n],
      account: ACCOUNT,
    });

    expect(preview.success).toBe(true);
    expect(preview.gasEstimate).toBeUndefined();
    expect(preview.calldata.startsWith('0xa9059cbb')).toBe(true);
  });

  it('returns a decoded error (never throws) when the dry-run reverts', async () => {
    const reverted = new BaseError('reverted', {
      cause: new ContractFunctionRevertedError({
        abi: abi as unknown as Abi,
        functionName: 'transfer',
        message: 'execution reverted',
      }),
    });
    const client = {
      getBlockNumber: vi.fn().mockResolvedValue(1n),
      simulateContract: vi.fn().mockRejectedValue(reverted),
      estimateContractGas: vi.fn(),
    } as unknown as PublicClient;

    const preview = await previewWrite(client, {
      address: TO,
      abi,
      functionName: 'transfer',
      args: [RECIPIENT, 5n],
      account: ACCOUNT,
    });

    expect(preview.success).toBe(false);
    expect(preview.error).toBeDefined();
    // Calldata is always available so the user can still inspect what would be sent.
    expect(preview.calldata.startsWith('0xa9059cbb')).toBe(true);
    expect(client.estimateContractGas).not.toHaveBeenCalled();
  });
});

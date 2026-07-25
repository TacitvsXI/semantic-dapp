import { describe, it, expect } from 'vitest';
import type { Abi } from 'abitype';
import { normalizeAbi } from '@semantic-dapp/spec';
import {
  detectErc721,
  detectErc1155,
  detectErc4626,
  detectErc2612,
  detectGovernor,
} from './standards.js';

function fn(name: string, inputs: string[], outputs: string[], mut = 'nonpayable') {
  return {
    type: 'function',
    name,
    stateMutability: mut,
    inputs: inputs.map((type, i) => ({ name: `a${i}`, type })),
    outputs: outputs.map((type) => ({ name: '', type })),
  } as const;
}

const erc721Abi = [
  fn('balanceOf', ['address'], ['uint256'], 'view'),
  fn('ownerOf', ['uint256'], ['address'], 'view'),
  fn('getApproved', ['uint256'], ['address'], 'view'),
  fn('isApprovedForAll', ['address', 'address'], ['bool'], 'view'),
  fn('approve', ['address', 'uint256'], []),
  fn('setApprovalForAll', ['address', 'bool'], []),
  fn('transferFrom', ['address', 'address', 'uint256'], []),
  fn('safeTransferFrom', ['address', 'address', 'uint256'], []),
  fn('safeTransferFrom', ['address', 'address', 'uint256', 'bytes'], []),
  fn('name', [], ['string'], 'view'),
  fn('symbol', [], ['string'], 'view'),
  fn('tokenURI', ['uint256'], ['string'], 'view'),
] as const satisfies Abi;

const erc1155Abi = [
  fn('balanceOf', ['address', 'uint256'], ['uint256'], 'view'),
  fn('balanceOfBatch', ['address[]', 'uint256[]'], ['uint256[]'], 'view'),
  fn('setApprovalForAll', ['address', 'bool'], []),
  fn('isApprovedForAll', ['address', 'address'], ['bool'], 'view'),
  fn('safeTransferFrom', ['address', 'address', 'uint256', 'uint256', 'bytes'], []),
  fn('safeBatchTransferFrom', ['address', 'address', 'uint256[]', 'uint256[]', 'bytes'], []),
  fn('uri', ['uint256'], ['string'], 'view'),
] as const satisfies Abi;

const erc4626Abi = [
  // ERC-20 share token core
  fn('totalSupply', [], ['uint256'], 'view'),
  fn('balanceOf', ['address'], ['uint256'], 'view'),
  fn('transfer', ['address', 'uint256'], ['bool']),
  fn('allowance', ['address', 'address'], ['uint256'], 'view'),
  fn('approve', ['address', 'uint256'], ['bool']),
  fn('transferFrom', ['address', 'address', 'uint256'], ['bool']),
  // ERC-4626 vault
  fn('asset', [], ['address'], 'view'),
  fn('totalAssets', [], ['uint256'], 'view'),
  fn('convertToShares', ['uint256'], ['uint256'], 'view'),
  fn('convertToAssets', ['uint256'], ['uint256'], 'view'),
  fn('deposit', ['uint256', 'address'], ['uint256']),
  fn('mint', ['uint256', 'address'], ['uint256']),
  fn('withdraw', ['uint256', 'address', 'address'], ['uint256']),
  fn('redeem', ['uint256', 'address', 'address'], ['uint256']),
] as const satisfies Abi;

const erc2612Abi = [
  // ERC-20 core
  fn('totalSupply', [], ['uint256'], 'view'),
  fn('balanceOf', ['address'], ['uint256'], 'view'),
  fn('transfer', ['address', 'uint256'], ['bool']),
  fn('allowance', ['address', 'address'], ['uint256'], 'view'),
  fn('approve', ['address', 'uint256'], ['bool']),
  fn('transferFrom', ['address', 'address', 'uint256'], ['bool']),
  // ERC-2612 permit
  fn('permit', ['address', 'address', 'uint256', 'uint256', 'uint8', 'bytes32', 'bytes32'], []),
  fn('nonces', ['address'], ['uint256'], 'view'),
  fn('DOMAIN_SEPARATOR', [], ['bytes32'], 'view'),
] as const satisfies Abi;

const governorAbi = [
  fn('propose', ['address[]', 'uint256[]', 'bytes[]', 'string'], ['uint256']),
  fn('castVote', ['uint256', 'uint8'], ['uint256']),
  fn('castVoteWithReason', ['uint256', 'uint8', 'string'], ['uint256']),
  fn('execute', ['address[]', 'uint256[]', 'bytes[]', 'bytes32'], ['uint256'], 'payable'),
  fn('queue', ['address[]', 'uint256[]', 'bytes[]', 'bytes32'], ['uint256']),
  fn('state', ['uint256'], ['uint8'], 'view'),
  fn('proposalSnapshot', ['uint256'], ['uint256'], 'view'),
  fn('proposalDeadline', ['uint256'], ['uint256'], 'view'),
  fn('votingDelay', [], ['uint256'], 'view'),
  fn('votingPeriod', [], ['uint256'], 'view'),
  fn('quorum', ['uint256'], ['uint256'], 'view'),
  fn('hasVoted', ['uint256', 'address'], ['bool'], 'view'),
  fn('getVotes', ['address', 'uint256'], ['uint256'], 'view'),
  fn('name', [], ['string'], 'view'),
] as const satisfies Abi;

describe('detectErc721', () => {
  it('detects a canonical ERC-721', () => {
    const result = detectErc721(normalizeAbi(erc721Abi as unknown as Abi));
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('does not detect a plain ERC-20', () => {
    const erc20 = normalizeAbi([
      fn('balanceOf', ['address'], ['uint256'], 'view'),
      fn('approve', ['address', 'uint256'], ['bool']),
      fn('transfer', ['address', 'uint256'], ['bool']),
    ] as unknown as Abi);
    expect(detectErc721(erc20).detected).toBe(false);
  });
});

describe('detectErc1155', () => {
  it('detects a canonical ERC-1155', () => {
    const result = detectErc1155(normalizeAbi(erc1155Abi as unknown as Abi));
    expect(result.detected).toBe(true);
  });
});

describe('detectErc4626', () => {
  it('detects a vault that is also an ERC-20', () => {
    const result = detectErc4626(normalizeAbi(erc4626Abi as unknown as Abi));
    expect(result.detected).toBe(true);
  });

  it('rejects a vault-shaped contract that is not an ERC-20', () => {
    const noShares = normalizeAbi([
      fn('asset', [], ['address'], 'view'),
      fn('totalAssets', [], ['uint256'], 'view'),
      fn('deposit', ['uint256', 'address'], ['uint256']),
      fn('withdraw', ['uint256', 'address', 'address'], ['uint256']),
      fn('redeem', ['uint256', 'address', 'address'], ['uint256']),
      fn('convertToShares', ['uint256'], ['uint256'], 'view'),
      fn('convertToAssets', ['uint256'], ['uint256'], 'view'),
    ] as unknown as Abi);
    expect(detectErc4626(noShares).detected).toBe(false);
  });
});

describe('detectErc2612', () => {
  it('detects an ERC-20 with permit', () => {
    const result = detectErc2612(normalizeAbi(erc2612Abi as unknown as Abi));
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('does not detect a plain ERC-20 without permit', () => {
    const erc20 = normalizeAbi([
      fn('totalSupply', [], ['uint256'], 'view'),
      fn('balanceOf', ['address'], ['uint256'], 'view'),
      fn('transfer', ['address', 'uint256'], ['bool']),
      fn('allowance', ['address', 'address'], ['uint256'], 'view'),
      fn('approve', ['address', 'uint256'], ['bool']),
      fn('transferFrom', ['address', 'address', 'uint256'], ['bool']),
    ] as unknown as Abi);
    expect(detectErc2612(erc20).detected).toBe(false);
  });

  it('rejects permit-shaped members without the ERC-20 core', () => {
    const noErc20 = normalizeAbi([
      fn('permit', ['address', 'address', 'uint256', 'uint256', 'uint8', 'bytes32', 'bytes32'], []),
      fn('nonces', ['address'], ['uint256'], 'view'),
      fn('DOMAIN_SEPARATOR', [], ['bytes32'], 'view'),
    ] as unknown as Abi);
    expect(detectErc2612(noErc20).detected).toBe(false);
  });
});

describe('detectGovernor', () => {
  it('detects an OpenZeppelin-style Governor', () => {
    const result = detectGovernor(normalizeAbi(governorAbi as unknown as Abi));
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('does not detect a plain ERC-20', () => {
    const erc20 = normalizeAbi([
      fn('balanceOf', ['address'], ['uint256'], 'view'),
      fn('transfer', ['address', 'uint256'], ['bool']),
      fn('approve', ['address', 'uint256'], ['bool']),
    ] as unknown as Abi);
    expect(detectGovernor(erc20).detected).toBe(false);
  });

  it('requires the full proposal lifecycle core', () => {
    const partial = normalizeAbi([
      fn('propose', ['address[]', 'uint256[]', 'bytes[]', 'string'], ['uint256']),
      fn('castVote', ['uint256', 'uint8'], ['uint256']),
      fn('votingDelay', [], ['uint256'], 'view'),
      fn('votingPeriod', [], ['uint256'], 'view'),
      // missing state / proposalSnapshot / proposalDeadline
    ] as unknown as Abi);
    expect(detectGovernor(partial).detected).toBe(false);
  });
});

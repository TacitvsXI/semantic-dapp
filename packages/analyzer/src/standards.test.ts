import { describe, it, expect } from 'vitest';
import type { Abi } from 'abitype';
import { normalizeAbi } from '@semantic-dapp/spec';
import {
  detectErc721,
  detectErc1155,
  detectErc4626,
  detectErc2612,
  detectDaiPermit,
  detectErc777,
  detectRebasing,
  detectGovernor,
  detectGovernorBravo,
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

const erc20CoreAbi = [
  fn('totalSupply', [], ['uint256'], 'view'),
  fn('balanceOf', ['address'], ['uint256'], 'view'),
  fn('transfer', ['address', 'uint256'], ['bool']),
  fn('allowance', ['address', 'address'], ['uint256'], 'view'),
  fn('approve', ['address', 'uint256'], ['bool']),
  fn('transferFrom', ['address', 'address', 'uint256'], ['bool']),
] as const;

const daiPermitAbi = [
  ...erc20CoreAbi,
  // DAI-style permit: bool allowed + expiry, not deadline+value.
  fn(
    'permit',
    ['address', 'address', 'uint256', 'uint256', 'bool', 'uint8', 'bytes32', 'bytes32'],
    [],
  ),
  fn('nonces', ['address'], ['uint256'], 'view'),
  fn('DOMAIN_SEPARATOR', [], ['bytes32'], 'view'),
] as const satisfies Abi;

describe('detectDaiPermit', () => {
  it('detects a DAI-style permit token', () => {
    const result = detectDaiPermit(normalizeAbi(daiPermitAbi as unknown as Abi));
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('is distinct from ERC-2612 (canonical permit is not DAI-style and vice versa)', () => {
    const dai = normalizeAbi(daiPermitAbi as unknown as Abi);
    expect(detectDaiPermit(dai).detected).toBe(true);
    // The canonical ERC-2612 permit signature is absent, so 2612 must not fire.
    expect(detectErc2612(dai).detected).toBe(false);
  });

  it('requires the ERC-20 core', () => {
    const noErc20 = normalizeAbi([
      fn(
        'permit',
        ['address', 'address', 'uint256', 'uint256', 'bool', 'uint8', 'bytes32', 'bytes32'],
        [],
      ),
      fn('nonces', ['address'], ['uint256'], 'view'),
    ] as unknown as Abi);
    expect(detectDaiPermit(noErc20).detected).toBe(false);
  });
});

const erc777Abi = [
  fn('granularity', [], ['uint256'], 'view'),
  fn('send', ['address', 'uint256', 'bytes'], []),
  fn('burn', ['uint256', 'bytes'], []),
  fn('isOperatorFor', ['address', 'address'], ['bool'], 'view'),
  fn('authorizeOperator', ['address'], []),
  fn('revokeOperator', ['address'], []),
  fn('defaultOperators', [], ['address[]'], 'view'),
  fn('operatorSend', ['address', 'address', 'uint256', 'bytes', 'bytes'], []),
  fn('operatorBurn', ['address', 'uint256', 'bytes', 'bytes'], []),
  fn('name', [], ['string'], 'view'),
  fn('symbol', [], ['string'], 'view'),
  fn('totalSupply', [], ['uint256'], 'view'),
  fn('balanceOf', ['address'], ['uint256'], 'view'),
] as const satisfies Abi;

describe('detectErc777', () => {
  it('detects an ERC-777 token by its operator/send surface', () => {
    const result = detectErc777(normalizeAbi(erc777Abi as unknown as Abi));
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('does not detect a plain ERC-20', () => {
    expect(detectErc777(normalizeAbi(erc20CoreAbi as unknown as Abi)).detected).toBe(false);
  });

  it('requires the operator core (send + authorizeOperator + operatorSend + granularity)', () => {
    const partial = normalizeAbi([
      fn('send', ['address', 'uint256', 'bytes'], []),
      fn('granularity', [], ['uint256'], 'view'),
      // missing authorizeOperator / operatorSend
    ] as unknown as Abi);
    expect(detectErc777(partial).detected).toBe(false);
  });
});

describe('detectRebasing', () => {
  it('detects a Lido-style share-based token', () => {
    const steth = normalizeAbi([
      ...erc20CoreAbi,
      fn('sharesOf', ['address'], ['uint256'], 'view'),
      fn('getTotalShares', [], ['uint256'], 'view'),
      fn('getSharesByPooledEth', ['uint256'], ['uint256'], 'view'),
      fn('getPooledEthByShares', ['uint256'], ['uint256'], 'view'),
    ] as unknown as Abi);
    const result = detectRebasing(steth);
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('detects an Aave aToken-style scaled-balance token', () => {
    const aToken = normalizeAbi([
      ...erc20CoreAbi,
      fn('scaledBalanceOf', ['address'], ['uint256'], 'view'),
      fn('scaledTotalSupply', [], ['uint256'], 'view'),
    ] as unknown as Abi);
    expect(detectRebasing(aToken).detected).toBe(true);
  });

  it('detects an AMPL-style elastic supply token', () => {
    const ampl = normalizeAbi([
      ...erc20CoreAbi,
      fn('rebase', ['uint256', 'int256'], ['uint256']),
    ] as unknown as Abi);
    expect(detectRebasing(ampl).detected).toBe(true);
  });

  it('does not flag a plain ERC-20', () => {
    expect(detectRebasing(normalizeAbi(erc20CoreAbi as unknown as Abi)).detected).toBe(false);
  });

  it('requires the ERC-20 core (share getters alone are not enough)', () => {
    const noErc20 = normalizeAbi([
      fn('sharesOf', ['address'], ['uint256'], 'view'),
      fn('getPooledEthByShares', ['uint256'], ['uint256'], 'view'),
    ] as unknown as Abi);
    expect(detectRebasing(noErc20).detected).toBe(false);
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

const governorBravoAbi = [
  // Bravo propose: includes signatures[] — disjoint from OZ's 4-arg propose.
  fn('propose', ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'string'], ['uint256']),
  fn('castVote', ['uint256', 'uint8'], []),
  fn('castVoteWithReason', ['uint256', 'uint8', 'string'], []),
  fn('queue', ['uint256'], []),
  fn('execute', ['uint256'], []),
  fn('cancel', ['uint256'], []),
  fn('state', ['uint256'], ['uint8'], 'view'),
  fn('getActions', ['uint256'], ['address[]', 'uint256[]', 'string[]', 'bytes[]'], 'view'),
  fn('getReceipt', ['uint256', 'address'], ['bool', 'uint8', 'uint96'], 'view'),
  fn('proposalCount', [], ['uint256'], 'view'),
  fn('quorumVotes', [], ['uint256'], 'view'),
  fn('proposalThreshold', [], ['uint256'], 'view'),
  fn('votingDelay', [], ['uint256'], 'view'),
  fn('votingPeriod', [], ['uint256'], 'view'),
] as const satisfies Abi;

const governorAlphaAbi = [
  fn('propose', ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'string'], ['uint256']),
  fn('castVote', ['uint256', 'bool'], []), // Alpha: bool support, not uint8
  fn('queue', ['uint256'], []),
  fn('execute', ['uint256'], []),
  fn('cancel', ['uint256'], []),
  fn('state', ['uint256'], ['uint8'], 'view'),
  fn('proposalCount', [], ['uint256'], 'view'),
] as const satisfies Abi;

describe('detectGovernorBravo', () => {
  it('detects a Governor Bravo–shaped contract', () => {
    const result = detectGovernorBravo(normalizeAbi(governorBravoAbi as unknown as Abi));
    expect(result.detected).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('detects a Governor Alpha–shaped contract (bool castVote)', () => {
    const result = detectGovernorBravo(normalizeAbi(governorAlphaAbi as unknown as Abi));
    expect(result.detected).toBe(true);
  });

  it('is disjoint from OpenZeppelin Governor (neither misfires on the other)', () => {
    const oz = normalizeAbi(governorAbi as unknown as Abi);
    const bravo = normalizeAbi(governorBravoAbi as unknown as Abi);
    expect(detectGovernor(oz).detected).toBe(true);
    expect(detectGovernorBravo(oz).detected).toBe(false);
    expect(detectGovernorBravo(bravo).detected).toBe(true);
    expect(detectGovernor(bravo).detected).toBe(false);
  });

  it('requires propose + castVote + id-based queue/execute + state', () => {
    const partial = normalizeAbi([
      fn('propose', ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'string'], ['uint256']),
      fn('castVote', ['uint256', 'uint8'], []),
      // missing queue/execute/state
    ] as unknown as Abi);
    expect(detectGovernorBravo(partial).detected).toBe(false);
  });
});

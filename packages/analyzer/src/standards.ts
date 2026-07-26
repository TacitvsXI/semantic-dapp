import type { ContractModel } from '@semantic-dapp/spec';
import { detectByMembers, type StandardMember } from './detect.js';
import type { FunctionSemantic, StandardDetection, StandardDetector } from './types.js';

const fn = (signature: string, required = true): StandardMember => ({
  signature,
  kind: 'function',
  required,
});
const ev = (signature: string, required = false): StandardMember => ({
  signature,
  kind: 'event',
  required,
});

/* ------------------------------- ERC-721 -------------------------------- */

const ERC721_MEMBERS: StandardMember[] = [
  fn('balanceOf(address)'),
  fn('ownerOf(uint256)'),
  fn('getApproved(uint256)'),
  fn('isApprovedForAll(address,address)'),
  fn('approve(address,uint256)'),
  fn('setApprovalForAll(address,bool)'),
  fn('transferFrom(address,address,uint256)'),
  fn('safeTransferFrom(address,address,uint256)'),
  fn('safeTransferFrom(address,address,uint256,bytes)'),
  fn('name()', false),
  fn('symbol()', false),
  fn('tokenURI(uint256)', false),
  fn('totalSupply()', false),
  fn('tokenByIndex(uint256)', false),
  fn('tokenOfOwnerByIndex(address,uint256)', false),
  ev('Transfer(address,address,uint256)'),
  ev('ApprovalForAll(address,address,bool)'),
];

const ERC721_SEMANTICS: Record<string, FunctionSemantic> = {
  'safeTransferFrom(address,address,uint256)': {
    operationType: 'token-transfer',
    audience: 'user',
    title: 'Transfer NFT',
    description: 'Safely transfer a token to another address.',
    isRead: false,
    risk: 'medium',
  },
  'safeTransferFrom(address,address,uint256,bytes)': {
    operationType: 'token-transfer',
    audience: 'user',
    title: 'Transfer NFT (with data)',
    isRead: false,
    risk: 'medium',
  },
  'transferFrom(address,address,uint256)': {
    operationType: 'token-transfer',
    audience: 'user',
    title: 'Transfer NFT (unsafe)',
    description: 'Transfer without the safe-receiver check.',
    isRead: false,
    risk: 'medium',
  },
  'approve(address,uint256)': {
    operationType: 'token-approve',
    audience: 'user',
    title: 'Approve NFT',
    description: 'Allow an address to manage a single token.',
    isRead: false,
    risk: 'medium',
  },
  'setApprovalForAll(address,bool)': {
    operationType: 'token-approve',
    audience: 'user',
    title: 'Approve all',
    description: 'Allow an operator to manage all of your tokens.',
    isRead: false,
    risk: 'high',
  },
  'ownerOf(uint256)': { operationType: 'read', audience: 'user', title: 'Owner of', isRead: true },
  'getApproved(uint256)': {
    operationType: 'read',
    audience: 'user',
    title: 'Get approved',
    isRead: true,
  },
  'isApprovedForAll(address,address)': {
    operationType: 'read',
    audience: 'user',
    title: 'Is approved for all',
    isRead: true,
  },
  'balanceOf(address)': { operationType: 'read', audience: 'user', title: 'Balance', isRead: true },
  'tokenURI(uint256)': {
    operationType: 'read',
    audience: 'user',
    title: 'Token URI',
    isRead: true,
  },
};

export function detectErc721(model: ContractModel): StandardDetection {
  return detectByMembers(model, {
    standard: 'erc-721',
    members: ERC721_MEMBERS,
    coreRequired: [
      'ownerOf(uint256)',
      'setApprovalForAll(address,bool)',
      'safeTransferFrom(address,address,uint256)',
    ],
    threshold: 0.6,
  });
}

export const erc721Detector: StandardDetector = {
  id: 'erc-721',
  detect: detectErc721,
  semantics: ERC721_SEMANTICS,
};

/* ------------------------------- ERC-1155 ------------------------------- */

const ERC1155_MEMBERS: StandardMember[] = [
  fn('balanceOf(address,uint256)'),
  fn('balanceOfBatch(address[],uint256[])'),
  fn('setApprovalForAll(address,bool)'),
  fn('isApprovedForAll(address,address)'),
  fn('safeTransferFrom(address,address,uint256,uint256,bytes)'),
  fn('safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)'),
  fn('uri(uint256)', false),
  ev('TransferSingle(address,address,address,uint256,uint256)'),
  ev('TransferBatch(address,address,address,uint256[],uint256[])'),
  ev('ApprovalForAll(address,address,bool)'),
];

const ERC1155_SEMANTICS: Record<string, FunctionSemantic> = {
  'safeTransferFrom(address,address,uint256,uint256,bytes)': {
    operationType: 'token-transfer',
    audience: 'user',
    title: 'Transfer tokens',
    description: 'Transfer an amount of a single token id.',
    isRead: false,
    risk: 'medium',
  },
  'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)': {
    operationType: 'token-transfer',
    audience: 'user',
    title: 'Batch transfer',
    isRead: false,
    risk: 'medium',
  },
  'setApprovalForAll(address,bool)': {
    operationType: 'token-approve',
    audience: 'user',
    title: 'Approve all',
    description: 'Allow an operator to manage all of your tokens.',
    isRead: false,
    risk: 'high',
  },
  'balanceOf(address,uint256)': {
    operationType: 'read',
    audience: 'user',
    title: 'Balance',
    isRead: true,
  },
  'balanceOfBatch(address[],uint256[])': {
    operationType: 'read',
    audience: 'user',
    title: 'Balance (batch)',
    isRead: true,
  },
  'uri(uint256)': { operationType: 'read', audience: 'user', title: 'URI', isRead: true },
};

export function detectErc1155(model: ContractModel): StandardDetection {
  return detectByMembers(model, {
    standard: 'erc-1155',
    members: ERC1155_MEMBERS,
    coreRequired: [
      'balanceOfBatch(address[],uint256[])',
      'safeTransferFrom(address,address,uint256,uint256,bytes)',
      'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)',
    ],
    threshold: 0.6,
  });
}

export const erc1155Detector: StandardDetector = {
  id: 'erc-1155',
  detect: detectErc1155,
  semantics: ERC1155_SEMANTICS,
};

/* ------------------------------- ERC-4626 ------------------------------- */

const ERC4626_MEMBERS: StandardMember[] = [
  fn('asset()'),
  fn('totalAssets()'),
  fn('convertToShares(uint256)'),
  fn('convertToAssets(uint256)'),
  fn('deposit(uint256,address)'),
  fn('mint(uint256,address)'),
  fn('withdraw(uint256,address,address)'),
  fn('redeem(uint256,address,address)'),
  fn('maxDeposit(address)', false),
  fn('previewDeposit(uint256)', false),
  fn('maxWithdraw(address)', false),
  fn('previewWithdraw(uint256)', false),
  fn('maxRedeem(address)', false),
  fn('previewRedeem(uint256)', false),
  ev('Deposit(address,address,uint256,uint256)'),
  ev('Withdraw(address,address,address,uint256,uint256)'),
];

const ERC4626_SEMANTICS: Record<string, FunctionSemantic> = {
  'deposit(uint256,address)': {
    operationType: 'vault-deposit',
    audience: 'user',
    title: 'Deposit assets',
    description: 'Deposit assets and receive vault shares.',
    isRead: false,
    risk: 'low',
  },
  'mint(uint256,address)': {
    operationType: 'vault-deposit',
    audience: 'user',
    title: 'Mint shares',
    description: 'Mint an exact number of shares by depositing assets.',
    isRead: false,
    risk: 'low',
  },
  'withdraw(uint256,address,address)': {
    operationType: 'vault-withdraw',
    audience: 'user',
    title: 'Withdraw assets',
    description: 'Withdraw assets by burning shares.',
    isRead: false,
    risk: 'medium',
  },
  'redeem(uint256,address,address)': {
    operationType: 'vault-withdraw',
    audience: 'user',
    title: 'Redeem shares',
    description: 'Redeem shares for the underlying assets.',
    isRead: false,
    risk: 'medium',
  },
  'asset()': { operationType: 'read', audience: 'user', title: 'Underlying asset', isRead: true },
  'totalAssets()': { operationType: 'read', audience: 'user', title: 'Total assets', isRead: true },
  'convertToShares(uint256)': {
    operationType: 'read',
    audience: 'user',
    title: 'Convert to shares',
    isRead: true,
  },
  'convertToAssets(uint256)': {
    operationType: 'read',
    audience: 'user',
    title: 'Convert to assets',
    isRead: true,
  },
};

export function detectErc4626(model: ContractModel): StandardDetection {
  return detectByMembers(model, {
    standard: 'erc-4626',
    members: ERC4626_MEMBERS,
    coreRequired: [
      'asset()',
      'totalAssets()',
      'deposit(uint256,address)',
      'withdraw(uint256,address,address)',
      'redeem(uint256,address,address)',
    ],
    threshold: 0.6,
    requiresErc20: true,
  });
}

export const erc4626Detector: StandardDetector = {
  id: 'erc-4626',
  detect: detectErc4626,
  semantics: ERC4626_SEMANTICS,
};

/* ------------------------------- ERC-2612 ------------------------------- */

const ERC2612_MEMBERS: StandardMember[] = [
  fn('permit(address,address,uint256,uint256,uint8,bytes32,bytes32)'),
  fn('nonces(address)'),
  fn('DOMAIN_SEPARATOR()'),
];

const ERC2612_SEMANTICS: Record<string, FunctionSemantic> = {
  'permit(address,address,uint256,uint256,uint8,bytes32,bytes32)': {
    operationType: 'token-approve',
    audience: 'user',
    title: 'Permit (gasless approve)',
    description:
      'Approve a spender with an off-chain EIP-712 signature - no prior approval transaction needed.',
    isRead: false,
    risk: 'high',
  },
  'nonces(address)': {
    operationType: 'read',
    audience: 'user',
    title: 'Permit nonce',
    description: 'Current signature nonce for an owner.',
    isRead: true,
  },
  'DOMAIN_SEPARATOR()': {
    operationType: 'read',
    audience: 'developer',
    title: 'EIP-712 domain separator',
    isRead: true,
  },
};

export function detectErc2612(model: ContractModel): StandardDetection {
  return detectByMembers(model, {
    standard: 'erc-2612',
    members: ERC2612_MEMBERS,
    coreRequired: [
      'permit(address,address,uint256,uint256,uint8,bytes32,bytes32)',
      'nonces(address)',
      'DOMAIN_SEPARATOR()',
    ],
    threshold: 0.6,
    requiresErc20: true,
  });
}

export const erc2612Detector: StandardDetector = {
  id: 'erc-2612',
  detect: detectErc2612,
  semantics: ERC2612_SEMANTICS,
};

/* ----------------------------- DAI-style permit ------------------------- */

// DAI predates ERC-2612 and uses a different permit shape: a `bool allowed`
// toggle (full/zero allowance) and an `expiry` instead of a `deadline`+`value`.
const DAI_PERMIT_SIG = 'permit(address,address,uint256,uint256,bool,uint8,bytes32,bytes32)';

const DAI_PERMIT_MEMBERS: StandardMember[] = [
  fn(DAI_PERMIT_SIG),
  fn('nonces(address)'),
  fn('DOMAIN_SEPARATOR()', false),
  fn('PERMIT_TYPEHASH()', false),
];

const DAI_PERMIT_SEMANTICS: Record<string, FunctionSemantic> = {
  [DAI_PERMIT_SIG]: {
    operationType: 'token-approve',
    audience: 'user',
    title: 'Permit (gasless approve, DAI-style)',
    description:
      'Approve a spender with an off-chain EIP-712 signature. DAI-style: the `allowed` flag ' +
      'toggles between full and zero allowance, gated by an `expiry`.',
    isRead: false,
    risk: 'high',
  },
  'nonces(address)': {
    operationType: 'read',
    audience: 'user',
    title: 'Permit nonce',
    description: 'Current signature nonce for an owner.',
    isRead: true,
  },
  'DOMAIN_SEPARATOR()': {
    operationType: 'read',
    audience: 'developer',
    title: 'EIP-712 domain separator',
    isRead: true,
  },
};

export function detectDaiPermit(model: ContractModel): StandardDetection {
  return detectByMembers(model, {
    standard: 'dai-permit',
    members: DAI_PERMIT_MEMBERS,
    coreRequired: [DAI_PERMIT_SIG, 'nonces(address)'],
    threshold: 0.6,
    requiresErc20: true,
  });
}

export const daiPermitDetector: StandardDetector = {
  id: 'dai-permit',
  detect: detectDaiPermit,
  semantics: DAI_PERMIT_SEMANTICS,
};

/* -------------------------------- ERC-777 ------------------------------- */

const ERC777_MEMBERS: StandardMember[] = [
  fn('granularity()'),
  fn('send(address,uint256,bytes)'),
  fn('burn(uint256,bytes)'),
  fn('isOperatorFor(address,address)'),
  fn('authorizeOperator(address)'),
  fn('revokeOperator(address)'),
  fn('defaultOperators()'),
  fn('operatorSend(address,address,uint256,bytes,bytes)'),
  fn('operatorBurn(address,uint256,bytes,bytes)'),
  fn('name()', false),
  fn('symbol()', false),
  fn('totalSupply()', false),
  fn('balanceOf(address)', false),
  ev('Sent(address,address,address,uint256,bytes,bytes)'),
  ev('Minted(address,address,uint256,bytes,bytes)'),
  ev('Burned(address,address,uint256,bytes,bytes)'),
  ev('AuthorizedOperator(address,address)'),
  ev('RevokedOperator(address,address)'),
];

const ERC777_SEMANTICS: Record<string, FunctionSemantic> = {
  'send(address,uint256,bytes)': {
    operationType: 'token-transfer',
    audience: 'user',
    title: 'Send tokens',
    description: 'Send tokens to an address, invoking its ERC-777 receiver hook.',
    isRead: false,
    risk: 'medium',
  },
  'operatorSend(address,address,uint256,bytes,bytes)': {
    operationType: 'token-transfer',
    audience: 'user',
    title: 'Operator send',
    description: 'Move tokens on behalf of a holder that authorized you as an operator.',
    isRead: false,
    risk: 'medium',
  },
  'burn(uint256,bytes)': {
    operationType: 'token-burn',
    audience: 'user',
    title: 'Burn tokens',
    isRead: false,
    risk: 'medium',
  },
  'operatorBurn(address,uint256,bytes,bytes)': {
    operationType: 'token-burn',
    audience: 'user',
    title: 'Operator burn',
    description: 'Burn tokens of a holder that authorized you as an operator.',
    isRead: false,
    risk: 'high',
  },
  'authorizeOperator(address)': {
    operationType: 'token-approve',
    audience: 'user',
    title: 'Authorize operator',
    description: 'Grant an operator full control to move and burn all of your tokens.',
    isRead: false,
    risk: 'high',
  },
  'revokeOperator(address)': {
    operationType: 'token-approve',
    audience: 'user',
    title: 'Revoke operator',
    description: 'Remove an operator you previously authorized.',
    isRead: false,
    risk: 'low',
  },
  'isOperatorFor(address,address)': {
    operationType: 'read',
    audience: 'user',
    title: 'Is operator for',
    isRead: true,
  },
  'granularity()': {
    operationType: 'read',
    audience: 'user',
    title: 'Granularity',
    isRead: true,
  },
  'defaultOperators()': {
    operationType: 'read',
    audience: 'user',
    title: 'Default operators',
    isRead: true,
  },
};

export function detectErc777(model: ContractModel): StandardDetection {
  return detectByMembers(model, {
    standard: 'erc-777',
    members: ERC777_MEMBERS,
    coreRequired: [
      'send(address,uint256,bytes)',
      'authorizeOperator(address)',
      'operatorSend(address,address,uint256,bytes,bytes)',
      'granularity()',
    ],
    threshold: 0.6,
  });
}

export const erc777Detector: StandardDetector = {
  id: 'erc-777',
  detect: detectErc777,
  semantics: ERC777_SEMANTICS,
};

/* ------------------------------- Governor ------------------------------- */

const GOVERNOR_MEMBERS: StandardMember[] = [
  fn('propose(address[],uint256[],bytes[],string)'),
  fn('castVote(uint256,uint8)'),
  fn('state(uint256)'),
  fn('proposalSnapshot(uint256)'),
  fn('proposalDeadline(uint256)'),
  fn('votingDelay()'),
  fn('votingPeriod()'),
  fn('castVoteWithReason(uint256,uint8,string)', false),
  fn('castVoteWithReasonAndParams(uint256,uint8,string,bytes)', false),
  fn('execute(address[],uint256[],bytes[],bytes32)', false),
  fn('queue(address[],uint256[],bytes[],bytes32)', false),
  fn('cancel(address[],uint256[],bytes[],bytes32)', false),
  fn('quorum(uint256)', false),
  fn('hasVoted(uint256,address)', false),
  fn('getVotes(address,uint256)', false),
  fn('proposalProposer(uint256)', false),
  fn('proposalThreshold()', false),
  fn('name()', false),
  fn('version()', false),
  fn('COUNTING_MODE()', false),
  ev(
    'ProposalCreated(uint256,address,address[],uint256[],string[],bytes[],uint256,uint256,string)',
  ),
  ev('VoteCast(address,uint256,uint8,uint256,string)'),
];

const GOVERNOR_SEMANTICS: Record<string, FunctionSemantic> = {
  'propose(address[],uint256[],bytes[],string)': {
    operationType: 'governance-propose',
    audience: 'user',
    title: 'Create proposal',
    description: 'Submit a new proposal: targets, values, calldatas and a description.',
    isRead: false,
    risk: 'medium',
  },
  'castVote(uint256,uint8)': {
    operationType: 'governance-vote',
    audience: 'user',
    title: 'Cast vote',
    description: 'Vote on a proposal (0 = Against, 1 = For, 2 = Abstain).',
    isRead: false,
    risk: 'low',
  },
  'castVoteWithReason(uint256,uint8,string)': {
    operationType: 'governance-vote',
    audience: 'user',
    title: 'Cast vote with reason',
    isRead: false,
    risk: 'low',
  },
  'castVoteWithReasonAndParams(uint256,uint8,string,bytes)': {
    operationType: 'governance-vote',
    audience: 'user',
    title: 'Cast vote with reason and params',
    isRead: false,
    risk: 'low',
  },
  'queue(address[],uint256[],bytes[],bytes32)': {
    operationType: 'governance-execute',
    audience: 'user',
    title: 'Queue proposal',
    description: 'Queue a succeeded proposal in the timelock before execution.',
    isRead: false,
    risk: 'medium',
  },
  'execute(address[],uint256[],bytes[],bytes32)': {
    operationType: 'governance-execute',
    audience: 'user',
    title: 'Execute proposal',
    description: 'Execute a succeeded (and queued) proposal - runs the encoded calls on-chain.',
    isRead: false,
    risk: 'high',
  },
  'cancel(address[],uint256[],bytes[],bytes32)': {
    operationType: 'admin-config',
    audience: 'admin',
    title: 'Cancel proposal',
    isRead: false,
    risk: 'high',
  },
  'state(uint256)': {
    operationType: 'read',
    audience: 'user',
    title: 'Proposal state',
    isRead: true,
  },
  'proposalSnapshot(uint256)': {
    operationType: 'read',
    audience: 'user',
    title: 'Proposal snapshot (vote start)',
    isRead: true,
  },
  'proposalDeadline(uint256)': {
    operationType: 'read',
    audience: 'user',
    title: 'Proposal deadline (vote end)',
    isRead: true,
  },
  'proposalProposer(uint256)': {
    operationType: 'read',
    audience: 'user',
    title: 'Proposal proposer',
    isRead: true,
  },
  'hasVoted(uint256,address)': {
    operationType: 'read',
    audience: 'user',
    title: 'Has voted',
    isRead: true,
  },
  'getVotes(address,uint256)': {
    operationType: 'read',
    audience: 'user',
    title: 'Votes at timepoint',
    isRead: true,
  },
  'quorum(uint256)': {
    operationType: 'read',
    audience: 'user',
    title: 'Quorum',
    isRead: true,
  },
  'votingDelay()': {
    operationType: 'read',
    audience: 'user',
    title: 'Voting delay',
    isRead: true,
  },
  'votingPeriod()': {
    operationType: 'read',
    audience: 'user',
    title: 'Voting period',
    isRead: true,
  },
  'proposalThreshold()': {
    operationType: 'read',
    audience: 'user',
    title: 'Proposal threshold',
    isRead: true,
  },
};

export function detectGovernor(model: ContractModel): StandardDetection {
  return detectByMembers(model, {
    standard: 'governor',
    members: GOVERNOR_MEMBERS,
    coreRequired: [
      'propose(address[],uint256[],bytes[],string)',
      'castVote(uint256,uint8)',
      'state(uint256)',
      'proposalSnapshot(uint256)',
      'proposalDeadline(uint256)',
    ],
    threshold: 0.6,
  });
}

export const governorDetector: StandardDetector = {
  id: 'governor',
  detect: detectGovernor,
  semantics: GOVERNOR_SEMANTICS,
};

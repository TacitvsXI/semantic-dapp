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

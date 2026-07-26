---
title: 'Generate a full dApp + admin console from any EVM contract - straight from the ABI'
published: true
description: 'Stop hand-writing throwaway contract UIs. An open-source, deterministic-first tool that turns any deployed EVM contract into a user dApp, an admin console and a raw developer UI - generated from the ABI.'
tags: ethereum, webdev, typescript, opensource
cover_image: https://raw.githubusercontent.com/TacitvsXI/semantic-dapp/main/docs/assets/social-preview.png
# Canonical (published first on dev.to). Do NOT uncomment for dev.to itself; on every
# cross-post (Hashnode/Medium/your blog) set the canonical to this URL:
# canonical_url: https://dev.to/ileskov/generate-a-full-dapp-admin-console-from-any-evm-contract-straight-from-the-abi-28kg
---

> **TL;DR** - [Semantic Dapp](https://github.com/TacitvsXI/semantic-dapp) analyzes any
> deployed EVM contract and generates a **User** dApp, an **Admin** console and a **Raw**
> developer UI from its ABI. Detection is deterministic and rule-based, with a confidence
> score and evidence for every decision. It's TypeScript + viem/wagmi, published on npm,
> self-hostable, AGPL-3.0. [**Live demo →**](https://tacitvsxi.github.io/semantic-dapp/)

## The problem: the throwaway-UI treadmill

Every time a team ships a smart contract, someone rebuilds the same disposable frontend:

- a wallet-connect button,
- one form per function,
- calldata encoding + decoding,
- `hasRole()` / `owner()` checks to hide privileged actions,
- gas estimation, a spinner, a receipt, an error decoder,
- and a "danger zone" for the functions that can brick the protocol.

It's tedious, it's copy-pasted between repos, and it rots the moment the ABI changes.
Meanwhile the two obvious escape hatches both fall short:

- **Etherscan's "Write" tab** gives you raw inputs with **zero meaning**. It has no idea
  that `mint` is privileged, that `pause` is a kill-switch, or that this `transfer` moves
  6-decimal USDC. Everything looks equally (un)safe.
- **A bespoke frontend** gives you meaning but costs **weeks**, and you pay that cost
  again for the next contract.

What if you could get _both_ - semantics **and** speed - from the one artifact every
contract already has: its ABI?

## What Semantic Dapp does

Paste a chain + address (or drop in an ABI / Foundry artifact) and you get three tabs:

![A generated dApp: User, Admin, Read and Raw tabs with semantic labels, roles and risk](https://raw.githubusercontent.com/TacitvsXI/semantic-dapp/main/docs/demo/demo.gif)

- **User** - the clean dApp: token overview, transfer, approve - the stuff end-users need.
- **Admin** - privileged operations (mint, pause, role management) with risk badges and a
  confirm flow for the dangerous ones.
- **Read** - a live dashboard that auto-calls no-arg getters and shows the results.
- **Raw** - every function, Etherscan-style, but annotated with what the tool understood.

Connect a wallet, simulate, execute. It runs entirely in your browser, and you can
self-host it or export a standalone app.

## How it works: analyze → manifest → UI

The pipeline is three stages, and the middle one is the important idea:

```
ABI/source ──▶ analyze ──▶ Semantic Manifest ──▶ generate UI
                (detect)     (reviewable JSON)      (React)
```

The **Semantic Manifest** is a machine-readable, _hand-editable_ description of what the
tool understood: which standards the contract implements, and for each function its title,
audience (user/admin), operation type, risk level, required permission, and - crucially -
the **evidence** behind every guess.

Because the manifest is just JSON, you can correct a misclassification, re-run analysis,
and your edits are preserved. The UI is a pure function of the manifest, so nothing about
the rendering is a black box.

### 1. Normalize the ABI

```ts
import { normalizeAbi } from '@semantic-dapp/spec';

const model = normalizeAbi(abi); // ContractModel: functions, events, errors, selectors
```

### 2. Classify into a manifest

```ts
import { buildManifest } from '@semantic-dapp/classifier';

const manifest = buildManifest(model, {
  projectName: 'My Token',
  contractId: 'contract',
  chainId: 1,
  abiSource: 'manual',
});

console.log(manifest.contracts[0].standards); // e.g. ['erc-20']
console.log(manifest.operations.length); // one entry per function
```

### 3. Inspect the reasoning

Every operation carries a confidence score and a list of evidence items, so you can see
_why_ a function was routed to the Admin tab or flagged as high-risk:

```ts
import { classifyContract } from '@semantic-dapp/classifier';

const { operations } = classifyContract(model, 'contract');

for (const op of operations) {
  console.log(op.function, op.audience, op.confidence);
  for (const e of op.evidence) {
    console.log(`  [${e.source}] ${e.detail} (${e.weight ?? 0})`);
  }
}
```

Sample output for `mint(address,uint256)`:

```
mint(address,uint256) admin 1
  [signature] Matches erc-20 rule for mint(address,uint256) (+1)
  [name] Function name "mint" suggests token-mint (+0.5)
```

That's the whole philosophy: **deterministic-first, explainable-always.**

## Deterministic-first, not "AI slop"

Detection is a rule engine, not a prompt. Semantic Dapp recognizes standards and access
models by their _members_ (selectors, signatures, interface IDs, events), with a weighted
confidence score:

- **Token & vault standards:** ERC-20, ERC-721, ERC-1155, ERC-4626, ERC-2612 (permit).
- **Governance:** OpenZeppelin Governor (propose / castVote / state / lifecycle).
- **Access & safety models:** Ownable, AccessControl (roles), Pausable, and
  EIP-1967 upgradeable proxies.

Evidence comes from concrete sources - `selector`, `signature`, `interface-id`, `name`,
`natspec`, `event`, `modifier`, `source-ast` - each contributing a weight. Confidence maps
to routing tiers (auto / suggested / review / raw-only), so low-confidence guesses degrade
gracefully into the Raw tab instead of pretending to be certain.

AI is **optional** and never trusted blindly: it can _suggest_ labels, but the deterministic
layer and your review are the source of truth.

## Fetching the ABI for you (proxy-aware)

You don't have to paste an ABI. Given a chain + address, the resolver tries verified
sources in trust order (Sourcify, then block explorers), follows **EIP-1967 proxies** to
their implementation, and attaches provenance so you know where the ABI came from:

```ts
import { resolveContract } from '@semantic-dapp/resolver';

const result = await resolveContract({ address, chainId, reader /* viem client */ });
// result carries the ABI, source (sourcify/explorer), and proxy implementation info
```

If nothing verified is found, it returns a typed failure so the UI can fall back to manual
paste - no silent guessing.

## The trusted-UI safety model

Generating an admin panel is only useful if you can _trust_ it. A few of the guardrails:

- **Confirm flow for risky writes.** High/critical operations require an explicit
  confirmation step; the most dangerous ones make you type `CONFIRM`.
- **Text sanitization against spoofing.** Contract-supplied strings (names, symbols,
  labels) are stripped of control, bidi-override and zero-width characters, and mixed-script
  homoglyphs are flagged - a real defense against address/label spoofing.
- **Role-aware UI.** With AccessControl, you pick a human-readable role instead of pasting a
  raw `bytes32` hash, and the UI can show which roles the connected account actually holds.
- **Local audit trail.** Writes you send are recorded per-project in your browser so you have
  a history of what happened.

![The Admin tab: a privileged mint function with admin / confidence / high-risk badges and evidence](https://raw.githubusercontent.com/TacitvsXI/semantic-dapp/main/docs/demo/generated-app.png)

## Try it in 30 seconds

**Live demo** (a generated dApp for mainnet USDC, runs in your browser):
<https://tacitvsxi.github.io/semantic-dapp/>

**CLI** - turn a local ABI/artifact into a portable bundle and a standalone app:

```bash
npx @semantic-dapp/cli bundle --abi ./out/MyToken.sol/MyToken.json --name "My Token" --chain 1
npx @semantic-dapp/cli export --bundle ./my-token.bundle.json --out ./my-token-app
```

**As a library** - the analysis engine is just npm packages:

```bash
pnpm add @semantic-dapp/spec @semantic-dapp/classifier viem
```

All nine building blocks are published under the
[`@semantic-dapp`](https://www.npmjs.com/org/semantic-dapp) scope with build provenance.

## Etherscan Write tab vs. bespoke UI vs. Semantic Dapp

|                                   | Etherscan Write | Bespoke frontend | Semantic Dapp  |
| --------------------------------- | --------------- | ---------------- | -------------- |
| Time to first UI                  | instant         | days–weeks       | seconds        |
| Understands standards/roles/risk  | ❌              | ✅ (you code it) | ✅ (generated) |
| User vs. admin separation         | ❌              | ✅ (you code it) | ✅             |
| Confirm flow for dangerous writes | ❌              | maybe            | ✅             |
| Self-hostable / offline           | ❌              | ✅               | ✅             |
| Reviewable + hand-editable output | ❌              | n/a              | ✅ (manifest)  |
| Cost per new contract             | free            | high             | ~zero          |

## FAQ

**Is this a security tool?** No - it's a UI generator with safety guardrails. It helps you
_see_ risk (privileged functions, kill-switches) but it doesn't audit contract logic.

**Why would I trust a generated admin panel?** You don't have to take it on faith: the
manifest is reviewable and editable, risky writes require confirmation, detection is
explainable, and the whole thing is open source and self-hostable.

**Does it need my private keys / a backend?** No. It's a client-side app using viem/wagmi;
you connect your own wallet, and analysis runs locally.

**What chains/contracts work?** Any EVM chain and any contract with an ABI. Verified source
(Sourcify/explorer) improves labels, but a bare ABI is enough.

## Wrapping up

If you've ever rebuilt the same contract admin UI for the third time, this is the tool I
wish I'd had. It's early and open source, and I'd genuinely love feedback from people who
maintain contracts: **what would you need before you'd trust a generated admin panel in
production?**

- Repo: <https://github.com/TacitvsXI/semantic-dapp>
- Live demo: <https://tacitvsxi.github.io/semantic-dapp/>
- npm: <https://www.npmjs.com/org/semantic-dapp>

If it could save you from writing one more throwaway panel, a ⭐ on the repo helps others
find it.

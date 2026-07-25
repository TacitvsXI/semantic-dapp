import type { ContractFunction, ContractModel } from '@semantic-dapp/spec';
import { GovernorPanel, TxStatusView } from '@semantic-dapp/components';
import type { ContractRuntime } from './runtime.js';

export interface GovernorActionsProps {
  model: ContractModel;
  runtime: ContractRuntime;
}

const PROPOSE_SIG = 'propose(address[],uint256[],bytes[],string)';
const CAST_VOTE_SIG = 'castVote(uint256,uint8)';
const CAST_VOTE_REASON_SIG = 'castVoteWithReason(uint256,uint8,string)';
const STATE_SIG = 'state(uint256)';

function findFn(model: ContractModel, signature: string): ContractFunction | undefined {
  return model.functions.find((f) => f.signature === signature);
}

/**
 * Wires the semantic {@link GovernorPanel} to the runtime: builds the triple-array
 * `propose`, casts votes (`castVote` / `castVoteWithReason`), and looks up a
 * proposal's on-chain `state`.
 */
export function GovernorActions({ model, runtime }: GovernorActionsProps) {
  const proposeFn = findFn(model, PROPOSE_SIG);
  const castVoteFn = findFn(model, CAST_VOTE_SIG);
  const castVoteReasonFn = findFn(model, CAST_VOTE_REASON_SIG);
  const stateFn = findFn(model, STATE_SIG);

  const proposeTx = proposeFn ? runtime.getTxState(proposeFn.signature) : undefined;
  const voteTx = castVoteFn ? runtime.getTxState(castVoteFn.signature) : undefined;
  const reasonTx = castVoteReasonFn ? runtime.getTxState(castVoteReasonFn.signature) : undefined;
  const isBusy = (tx?: { phase: string }) =>
    tx?.phase === 'pending' || tx?.phase === 'awaiting-signature';

  const activeTx = proposeTx ?? voteTx ?? reasonTx;

  return (
    <div className="sd-gov-actions">
      <GovernorPanel
        canVoteWithReason={castVoteReasonFn !== undefined}
        busy={{ propose: isBusy(proposeTx), vote: isBusy(voteTx) || isBusy(reasonTx) }}
        onPropose={(targets, values, calldatas, description) => {
          if (!proposeFn) return;
          void runtime.submitWrite(proposeFn, [targets, values, calldatas, description]);
        }}
        onVote={(proposalId, support, reason) => {
          if (reason !== undefined && castVoteReasonFn) {
            void runtime.submitWrite(castVoteReasonFn, [proposalId, support, reason]);
          } else if (castVoteFn) {
            void runtime.submitWrite(castVoteFn, [proposalId, support]);
          }
        }}
        {...(stateFn
          ? {
              onCheckState: async (proposalId: bigint) => {
                try {
                  const out = await runtime.callRead(stateFn, [proposalId]);
                  const value = out[0]?.value;
                  return typeof value === 'string' ? Number(value) : undefined;
                } catch {
                  return undefined;
                }
              },
            }
          : {})}
      />
      {activeTx ? <TxStatusView state={activeTx} explorerUrl={runtime.explorerUrl} /> : null}
    </div>
  );
}

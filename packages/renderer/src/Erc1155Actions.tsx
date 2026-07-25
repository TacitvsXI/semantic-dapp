import type { ContractFunction, ContractModel } from '@semantic-dapp/spec';
import { BatchTransferPanel, TxStatusView } from '@semantic-dapp/components';
import type { ContractRuntime } from './runtime.js';

export interface Erc1155ActionsProps {
  model: ContractModel;
  runtime: ContractRuntime;
}

const BATCH_SIG = 'safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)';

function findFn(model: ContractModel, signature: string): ContractFunction | undefined {
  return model.functions.find((f) => f.signature === signature);
}

/**
 * Wires the semantic ERC-1155 {@link BatchTransferPanel} to the runtime: builds
 * `safeBatchTransferFrom(from, to, ids, amounts, "0x")` from paired rows, using
 * the connected account as `from`.
 */
export function Erc1155Actions({ model, runtime }: Erc1155ActionsProps) {
  const batchFn = findFn(model, BATCH_SIG);
  if (!batchFn) return null;

  const from = runtime.wallet.address;
  const tx = runtime.getTxState(batchFn.signature);
  const busy = tx?.phase === 'pending' || tx?.phase === 'awaiting-signature';

  return (
    <div className="sd-erc1155-actions">
      <BatchTransferPanel
        {...(from !== undefined ? { from } : {})}
        {...(runtime.explorerUrl ? { explorerUrl: runtime.explorerUrl } : {})}
        busy={busy}
        onTransfer={(to, ids, amounts) => {
          const sender = (from ?? to) as `0x${string}`;
          void runtime.submitWrite(batchFn, [sender, to, ids, amounts, '0x']);
        }}
      />
      {tx ? <TxStatusView state={tx} explorerUrl={runtime.explorerUrl} /> : null}
    </div>
  );
}

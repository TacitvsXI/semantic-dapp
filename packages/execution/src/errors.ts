import {
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionExecutionError,
  UserRejectedRequestError,
} from 'viem';

export type ExecutionErrorKind =
  'user-rejected' | 'revert' | 'custom-error' | 'network' | 'unknown';

export interface DecodedExecutionError {
  kind: ExecutionErrorKind;
  /** Short, human-readable title. */
  title: string;
  /** Longer explanation, safe to show in details. */
  detail: string;
  /** Decoded custom error name, when available. */
  errorName?: string;
  /** Decoded custom error arguments, stringified. */
  errorArgs?: string[];
}

function stringifyArgs(args: readonly unknown[] | undefined): string[] | undefined {
  if (!args) return undefined;
  return args.map((a) => (typeof a === 'bigint' ? a.toString() : String(a)));
}

/**
 * Turn a viem/wallet error into a structured, user-safe description. Decodes
 * custom errors and standard revert reasons; never silently swallows failures.
 */
export function decodeExecutionError(error: unknown): DecodedExecutionError {
  if (error instanceof BaseError) {
    const rejected = error.walk((e) => e instanceof UserRejectedRequestError);
    if (rejected) {
      return {
        kind: 'user-rejected',
        title: 'Transaction rejected',
        detail: 'The request was rejected in the wallet.',
      };
    }

    const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError) as
      ContractFunctionRevertedError | undefined;
    if (reverted) {
      const data = reverted.data;
      if (data?.errorName) {
        return {
          kind: 'custom-error',
          title: `Reverted: ${data.errorName}`,
          detail: reverted.shortMessage,
          errorName: data.errorName,
          errorArgs: stringifyArgs(data.args),
        };
      }
      return {
        kind: 'revert',
        title: 'Transaction reverted',
        detail: reverted.reason ?? reverted.shortMessage,
      };
    }

    const execution = error.walk((e) => e instanceof ContractFunctionExecutionError) as
      ContractFunctionExecutionError | undefined;
    if (execution) {
      return {
        kind: 'revert',
        title: 'Contract call failed',
        detail: execution.shortMessage,
      };
    }

    return {
      kind: 'network',
      title: 'Request failed',
      detail: error.shortMessage,
    };
  }

  if (error instanceof Error) {
    // Transport failures can surface as plain Errors (e.g. fetch/HTTP) rather
    // than viem BaseErrors; recognize them so callers can distinguish an
    // unreachable RPC from a contract revert.
    if (isTransportMessage(error.message)) {
      return { kind: 'network', title: 'Request failed', detail: error.message };
    }
    return { kind: 'unknown', title: 'Error', detail: error.message };
  }
  return { kind: 'unknown', title: 'Error', detail: String(error) };
}

const TRANSPORT_MESSAGE =
  /http request failed|failed to fetch|fetch failed|networkerror|network error|timed out|timeout|connection (refused|reset|closed)|econnrefused|err_network/i;

/** Heuristic: does a plain error message look like a transport/RPC failure? */
export function isTransportMessage(message: string): boolean {
  return TRANSPORT_MESSAGE.test(message);
}

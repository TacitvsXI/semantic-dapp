export interface ParsedArgs {
  command?: string;
  flags: Record<string, string>;
  booleans: Set<string>;
}

/**
 * Tiny zero-dependency argv parser. Supports `--key value`, `--key=value` and
 * boolean flags (`--flag`, `-h`, `-v`). The first non-flag token is the command.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string> = {};
  const booleans = new Set<string>();
  let command: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]!;
    if (token.startsWith('--')) {
      const body = token.slice(2);
      const eq = body.indexOf('=');
      if (eq >= 0) {
        flags[body.slice(0, eq)] = body.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('-')) {
          flags[body] = next;
          i += 1;
        } else {
          booleans.add(body);
        }
      }
    } else if (token.startsWith('-') && token.length > 1) {
      booleans.add(token.slice(1));
    } else if (command === undefined) {
      command = token;
    }
  }

  return { command, flags, booleans };
}

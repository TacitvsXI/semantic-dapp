import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

function resolveFile(root: string, urlPath: string): string | undefined {
  const clean = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  // Prevent path traversal outside the served root.
  const rel = normalize(clean).replace(/^(\.\.[\\/])+/, '');
  let target = join(root, rel);
  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
  return existsSync(target) ? target : undefined;
}

export interface ServeOptions {
  dir: string;
  port?: number;
}

/**
 * Serve a built/exported static site with SPA fallback to `index.html`. Zero
 * dependencies — good enough to preview an exported app or a `dist` folder.
 */
export function serve(options: ServeOptions): Promise<{ port: number; close: () => void }> {
  const root = options.dir;
  if (!existsSync(join(root, 'index.html'))) {
    throw new Error(`No index.html in ${root}. Build the app first (e.g. vite build).`);
  }

  const server = createServer((req, res) => {
    const file = resolveFile(root, req.url ?? '/') ?? join(root, 'index.html');
    try {
      const body = readFileSync(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(500);
      res.end('Internal error');
    }
  });

  return new Promise((resolve) => {
    server.listen(options.port ?? 4174, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : (options.port ?? 4174);
      resolve({ port, close: () => server.close() });
    });
  });
}

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const routes = new Map([
  ['/', ['web/index.html', 'text/html; charset=utf-8']],
  ...['app.js', 'checker.worker.js', 'samples.js'].map(name => [`/${name}`, [`web/${name}`, 'text/javascript; charset=utf-8']]),
  ['/styles.css', ['web/styles.css', 'text/css; charset=utf-8']],
  ['/icon.svg', ['web/icon.svg', 'image/svg+xml']],
  ...['lato-regular.ttf', 'lato-bold.ttf'].map(name => [`/assets/${name}`, [`web/assets/${name}`, 'font/ttf']]),
  ...['index', 'format', 'parse', 'build', 'check', 'decimal', 'amounts', 'explain', 'field-rules', 'classifications', 'code-lists', 'loc-codes'].map(name => [`/dist/${name}.js`, [`dist/${name}.js`, 'text/javascript; charset=utf-8']]),
]);
const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

/** Serve an explicit asset allowlist. No invoice body is read or written. */
export function createWebServer() {
  return createServer(async (request, response) => {
    const port = request.socket.localPort;
    const host = request.headers.host;
    const send = (status, body = '') => {
      response.writeHead(status, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return send(403, 'Local access only.');
    if (!['GET', 'HEAD'].includes(request.method)) return send(405, 'Only GET and HEAD are supported.');
    const target = routes.get(request.url);
    if (!target) return send(404, 'Not found.');
    try {
      const data = await readFile(resolve(root, target[0]));
      response.writeHead(200, { ...headers, 'Content-Type': target[1], 'Content-Length': data.length });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch {
      send(503, 'Asset unavailable. Run npm run build before starting the checker.');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const port = args.length === 0 ? 4173 : args.length === 2 && args[0] === '--port' ? Number(args[1]) : NaN;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    console.error('Usage: npm run web -- [--port 4173]');
    process.exitCode = 1;
  } else {
    const server = createWebServer();
    server.on('error', error => {
      console.error(`Could not start the local checker: ${error.code ?? 'server error'}`);
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => console.log(`billcheck is ready at http://127.0.0.1:${port}`));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
  }
}

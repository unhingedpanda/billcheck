import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'node:http';
import { createWebServer } from '../../scripts/serve-web.mjs';

test('local server serves only application assets and refuses writes', async () => {
  const server = createWebServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(base);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Check an invoice/);
    assert.match(response.headers.get('content-security-policy'), /connect-src 'none'/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal((await fetch(`${base}/app.js`, { method: 'HEAD' })).status, 200);
    assert.equal((await fetch(`${base}/dist/check.js`)).status, 200);
    for (const route of ['/package.json', '/tests/fixtures/synthetic-1998b.txt', '/src/check.ts', '/%2e%2e/README.md', '/dist/index.d.ts']) {
      assert.equal((await fetch(base + route)).status, 404, route);
    }
    assert.equal((await fetch(base, { method: 'POST', body: 'confidential invoice' })).status, 405);
    const hostStatus = await new Promise((resolve, reject) => {
      get(base, { headers: { Host: 'other.example' } }, response => {
        response.resume();
        response.on('end', () => resolve(response.statusCode));
      }).on('error', reject);
    });
    assert.equal(hostStatus, 403);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

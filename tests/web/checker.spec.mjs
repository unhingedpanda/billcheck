import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const good = await readFile(new URL('../fixtures/synthetic-1998b.txt', import.meta.url));
const bad = await readFile(new URL('../../examples/invalid-invoice.txt', import.meta.url));
const upload = (page, buffer, name = 'invoice.txt') => page.getByLabel('Invoice file').setInputFiles({ name, mimeType: 'text/plain', buffer });
test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('examples explain errors and complete report downloads without invoice rows', async ({ page }) => {
  await page.getByRole('button', { name: 'Try a file with issues' }).click();
  await expect(page.getByRole('heading', { name: '2 errors to resolve' })).toBeVisible();
  await expect(page.getByText('Synthetic example', { exact: true })).toBeVisible();
  await page.getByText('Invalid date', { exact: true }).click();
  await expect(page.getByText('Use YYYYMMDD with a valid year, month and day.')).toBeVisible();
  await expect(page.getByText('Related LOC code [402-0036]')).toBeVisible();
  const downloadWait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download report' }).click();
  const download = await downloadWait;
  const report = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(report.status).toBe('fail');
  expect(report.summary.errorCount).toBe(2);
  expect(report.diagnostics).toHaveLength(2);
  expect(report.records).toBeUndefined();
  await page.getByRole('button', { name: 'Clear file' }).click();
  await page.getByRole('button', { name: 'Try a passing file' }).click();
  await expect(page.getByRole('heading', { name: 'No issues found' })).toBeVisible();
  await expect(page.locator('#result-note')).toBeVisible();
});

test('raw file bytes, literal filenames, clearing and refresh stay private', async ({ page, context }) => {
  const requests = [];
  page.on('request', request => requests.push({ url: request.url(), method: request.method(), body: request.postData() }));
  const bytes = Buffer.from(good);
  bytes[bytes.indexOf('Review file')] = 0x92;
  await upload(page, bytes, '<img src=x onerror=alert(1)>.txt');
  await expect(page.getByRole('heading', { name: '1 error to resolve' })).toBeVisible();
  await expect(page.getByText(/This field contains a non-ASCII character/)).toBeVisible();
  await expect(page.locator('#file-name')).toHaveText('<img src=x onerror=alert(1)>.txt');
  expect(requests.every(r => r.method === 'GET' && r.body === null && r.url.startsWith('http://127.0.0.1:4174/'))).toBe(true);
  expect(await context.cookies()).toHaveLength(0);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await page.getByRole('button', { name: 'Clear file' }).click();
  await expect(page.getByRole('button', { name: 'Download report' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Your review starts here' })).toBeVisible();
  await upload(page, good);
  await expect(page.getByRole('heading', { name: 'No issues found' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your review starts here' })).toBeVisible();
});

test('tolerance edits invalidate results until explicitly rechecked', async ({ page }) => {
  await upload(page, Buffer.from(good.toString().replace('|12.3400|20261001', '|12.3500|20261001')));
  await expect(page.getByRole('heading', { name: '1 error to resolve' })).toBeVisible();
  await page.getByText('Check settings', { exact: true }).click();
  await page.getByLabel('Amount tolerance').fill('0.01');
  await expect(page.getByRole('button', { name: 'Download report' })).toBeHidden();
  await page.getByRole('button', { name: 'Check invoice', exact: true }).click();
  await expect(page.getByRole('heading', { name: '1 warning to review' })).toBeVisible();
  await page.getByLabel('Amount tolerance').fill('no');
  await page.getByRole('button', { name: 'Check invoice', exact: true }).click();
  await expect(page.getByText('Enter a nonnegative decimal with up to four decimal places.')).toBeVisible();
  await expect(page.getByLabel('Amount tolerance')).toBeFocused();
});

test('file drop checks one file and reports unsupported input size', async ({ page }) => {
  const transfer = await page.evaluateHandle(text => {
    const data = new DataTransfer();
    data.items.add(new File([text], 'dropped.txt', { type: 'text/plain' }));
    return data;
  }, good.toString());
  await page.locator('#drop-zone').dispatchEvent('drop', { dataTransfer: transfer });
  await expect(page.getByRole('heading', { name: 'No issues found' })).toBeVisible();
  await upload(page, Buffer.alloc(5_000_001));
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download report' })).toBeHidden();
});

test('a late file read cannot replace a newer selection or a clear action', async ({ page }) => {
  await page.evaluate(() => {
    const read = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = async function () {
      const result = await read.call(this);
      if (this.name === 'slow.txt') await new Promise(resolve => setTimeout(resolve, 700));
      return result;
    };
  });
  await upload(page, bad, 'slow.txt');
  await upload(page, good, 'new.txt');
  await expect(page.getByRole('heading', { name: 'No issues found' })).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.locator('#file-name')).toHaveText('new.txt');
  await expect(page.getByRole('heading', { name: 'No issues found' })).toBeVisible();
  await upload(page, bad, 'slow.txt');
  await page.getByRole('button', { name: 'Clear file' }).click();
  await page.waitForTimeout(800);
  await expect(page.getByRole('heading', { name: 'Your review starts here' })).toBeVisible();
});

test('long reports page all findings, filter severity and export the full set', async ({ page }) => {
  const lines = bad.toString().split('\r\n');
  const records = Array.from({ length: 65 }, (_, index) => {
    const fields = lines[2].slice(0, -2).split('|');
    fields[1] = `INV-${index}`;
    return `${fields.join('|')}[]`;
  });
  await upload(page, Buffer.from([...lines.slice(0, 2), ...records, ''].join('\r\n')));
  await expect(page.getByRole('heading', { name: '130 errors to resolve' })).toBeVisible();
  await expect(page.locator('.issue')).toHaveCount(50);
  await expect(page.locator('#page-label')).toHaveText('1–50 of 130 findings');
  await page.getByRole('button', { name: 'Next page' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#page-label')).toHaveText('51–100 of 130 findings');
  await expect(page.locator('.issue > summary').first()).toBeFocused();
  await expect(page.locator('.issue > summary').first()).toBeInViewport();
  await page.getByRole('button', { name: 'Warnings 0', exact: true }).click();
  await expect(page.locator('#findings').getByText('No warnings in this report.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Warnings 0', exact: true })).toBeFocused();
  const downloadWait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download report' }).click();
  const report = JSON.parse(await readFile(await (await downloadWait).path(), 'utf8'));
  expect(report.diagnostics).toHaveLength(130);
});

test('mobile layout and keyboard controls stay usable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole('button', { name: 'Try a file with issues' }).click();
  await page.getByText('Invoice total does not reconcile', { exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Clear file' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Your review starts here' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose a file' }).focus();
  expect(await page.getByRole('button', { name: 'Choose a file' }).evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
});

test('leaving the page clears the view before a possible history restore', async ({ page }) => {
  await upload(page, bad, 'private-invoice.txt');
  await expect(page.getByRole('heading', { name: '2 errors to resolve' })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await expect(page.getByRole('heading', { name: 'Your review starts here' })).toBeVisible();
  await expect(page.locator('#file-name')).toHaveText('');
  await expect(page.getByRole('button', { name: 'Download report' })).toBeHidden();
  await expect(page.locator('.issue')).toHaveCount(0);
});

test('empty, unreadable and over-record-limit files have recoverable errors', async ({ page }) => {
  await upload(page, Buffer.alloc(0));
  await expect(page.getByRole('heading', { name: /error.*to resolve/ })).toBeVisible();
  await upload(page, Buffer.from('[]'.repeat(10_003)));
  await expect(page.getByRole('alert')).toHaveText('This file exceeds the 10,000-record preview limit. Use the local CLI for larger files.');
  await page.evaluate(() => { File.prototype.arrayBuffer = async () => { throw new Error('unreadable'); }; });
  await upload(page, good);
  await expect(page.getByRole('alert')).toHaveText('The browser could not read this file. Select it again and retry.');
  await expect(page.getByRole('button', { name: 'Download report' })).toBeHidden();
});

test('slow or failed workers terminate with an actionable state', async ({ page }) => {
  await page.clock.install();
  await page.evaluate(() => { window.Worker = class { postMessage() {} terminate() { window.workerTerminated = true; } }; });
  await upload(page, good);
  await expect(page.getByRole('heading', { name: 'Checking your invoice…' })).toBeVisible();
  await page.clock.fastForward(15001);
  await expect(page.getByRole('alert')).toHaveText('This check took too long. Choose a smaller file or use the local CLI.');
  expect(await page.evaluate(() => window.workerTerminated)).toBe(true);
  await page.evaluate(() => { window.Worker = class { constructor() { throw new Error('unavailable'); } }; });
  await upload(page, good);
  await expect(page.getByRole('alert')).toBeVisible();
});

test('mobile selection brings results into view', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await upload(page, good);
  await expect(page.getByRole('heading', { name: 'No issues found' })).toBeInViewport();
});

test('format findings explain timekeeper names and reference classifications', async ({ page }) => {
  await upload(page, Buffer.from(good.toString().replace('Doe, Jane', 'Jane Doe').replace('ASSOC', 'PARTNER')));
  await expect(page.getByRole('heading', { name: '2 errors to resolve' })).toBeVisible();
  await page.getByText('Timekeeper name needs surname, given name', { exact: true }).click();
  await expect(page.getByText('Format the source name as Last name, First name without inventing missing parts.')).toBeVisible();
  await page.getByText('Unknown reference classification', { exact: true }).click();
  await expect(page.getByText(/Membership does not establish role eligibility or client approval/)).toBeVisible();
  await page.getByText('What this check covers', { exact: true }).click();
  await expect(page.getByText(/Client code lists are available through the local CLI and library/)).toBeVisible();
});

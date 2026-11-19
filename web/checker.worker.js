import { check1998B } from './dist/index.js';

const PAGE_SIZE = 50;
let report = null;
let fileName = '';
let tolerance = '0';

function page(filter, requestedPage, requestId) {
  if (!report) return;
  const findings = filter === 'all' ? report.diagnostics : report.diagnostics.filter(item => item.severity === filter);
  const pageNumber = Math.max(0, Math.min(requestedPage, Math.ceil(findings.length / PAGE_SIZE) - 1));
  const start = pageNumber * PAGE_SIZE;
  // Only a bounded slice crosses to the main thread, including bounded display values.
  const diagnostics = findings.slice(start, start + PAGE_SIZE).map(item => Object.fromEntries(
    Object.entries(item).map(([key, value]) => [key, typeof value === 'string' && value.length > 300 ? `${value.slice(0, 300)}… [truncated, full value in JSON]` : value]),
  ));
  self.postMessage({ type: 'page', requestId, filter, pageNumber, total: findings.length, diagnostics });
}

self.onmessage = ({ data }) => {
  try {
    if (data.type === 'check') {
      const bytes = new Uint8Array(data.buffer);
      if (bytes.length > 5_000_000) throw new Error('This file exceeds the 5 MB preview limit. Choose a smaller file.');
      let frames = 0;
      for (let index = 0; index < bytes.length - 1; index++) {
        if (bytes[index] === 91 && bytes[index + 1] === 93 && ++frames > 10_002) {
          throw new Error('This file exceeds the 10,000-record preview limit. Use the local CLI for larger files.');
        }
      }
      fileName = data.fileName;
      tolerance = data.tolerance;
      report = check1998B(bytes, { amountTolerance: tolerance });
      self.postMessage({ type: 'result', status: report.status, summary: report.summary });
      page('all', 0, 0);
    } else if (data.type === 'page') {
      page(data.filter, data.pageNumber, data.requestId);
    } else if (data.type === 'export' && report) {
      const blob = new Blob([JSON.stringify({ fileName, amountTolerance: tolerance, ...report }, null, 2) + '\n'], { type: 'application/json' });
      self.postMessage({ type: 'export', blob });
    }
  } catch (error) {
    report = null;
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'The check could not finish. Select the file again.' });
  }
};

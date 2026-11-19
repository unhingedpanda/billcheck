import { sampleFile } from './samples.js';

const $ = id => document.getElementById(id);
const input = $('file-input');
const reportPanel = document.querySelector('.report');
const filters = [...document.querySelectorAll('[data-filter]')];
let selected = null;
let worker = null;
let generation = 0;
let timer = null;
let pageRequest = 0;
let currentPage = 0;
let currentFilter = 'all';
let focusPage = false;
let completed = false;
const downloadUrls = new Set();

function announce(message) { $('announcement').textContent = message; }
function stopWork() {
  generation++;
  worker?.terminate();
  worker = null;
  clearTimeout(timer);
  timer = null;
  completed = false;
  pageRequest = 0;
  focusPage = false;
  $('download').disabled = false;
  reportPanel.setAttribute('aria-busy', 'false');
  for (const url of downloadUrls) URL.revokeObjectURL(url);
  downloadUrls.clear();
  return generation;
}

function showState(state) {
  for (const name of ['empty', 'pending', 'results']) $(name).hidden = name !== state;
  if (state !== 'results') $('findings').replaceChildren();
}

function pending(title, copy, loading = false) {
  showState('pending');
  $('pending-title').textContent = title;
  $('pending-copy').textContent = copy;
  $('pending-icon').className = `status-icon ${loading ? 'loading' : 'ready'}`;
  setIcon($('pending-icon'), loading ? 'wait' : 'file');
  reportPanel.setAttribute('aria-busy', String(loading));
  announce(title);
}

function fail(message) {
  stopWork();
  $('file-error').hidden = false;
  $('file-error').textContent = message;
  $('check').hidden = !selected;
  $('check').disabled = false;
  pending('Could not check this file', 'Review the message beside your file, then try again.');
  announce(message);
}

function renderFile() {
  $('selection').hidden = !selected;
  if (!selected) return;
  $('file-name').textContent = selected.file.name;
  $('file-meta').textContent = `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(selected.file.size / 1000)} KB`;
  $('sample-label').hidden = !selected.sample;
}

function clearFile(focus = true) {
  stopWork();
  selected = null;
  input.value = '';
  $('file-name').textContent = '';
  $('file-meta').textContent = '';
  $('selection').hidden = true;
  $('file-error').hidden = true;
  $('file-error').textContent = '';
  $('check').hidden = true;
  $('check').textContent = 'Check invoice';
  showState('empty');
  if (focus) {
    $('choose').focus();
    announce('File cleared. Choose another invoice.');
  } else announce('');
}

async function chooseFile(file, sample = false) {
  stopWork();
  selected = { file, sample };
  renderFile();
  $('file-error').hidden = true;
  $('check').hidden = false;
  if (file.size > 5_000_000) return fail('This file exceeds the 5 MB preview limit. Choose a smaller file.');
  await check();
}

function toleranceValid() {
  const value = $('tolerance').value;
  const valid = value.length <= 32 && /^(?:\d+(?:\.\d{0,4})?|\.\d{1,4})$/.test(value);
  $('tolerance-error').hidden = valid;
  $('tolerance').setAttribute('aria-invalid', String(!valid));
  if (!valid) {
    document.querySelector('.settings').open = true;
    $('tolerance').focus();
    announce($('tolerance-error').textContent);
  }
  return valid;
}

async function check() {
  if (!selected) return;
  const run = stopWork();
  $('file-error').hidden = true;
  $('check').hidden = false;
  $('check').disabled = false;
  if (!toleranceValid()) {
    pending('Ready to check again', 'Enter a valid amount tolerance to continue.');
    return;
  }
  const file = selected.file;
  if (file.size > 5_000_000) return fail('This file exceeds the 5 MB preview limit. Choose a smaller file.');
  const tolerance = $('tolerance').value;
  pending('Checking your invoice…', 'You can clear or replace the file at any time.', true);
  $('check').disabled = true;
  timer = setTimeout(() => {
    if (run === generation) fail('This check took too long. Choose a smaller file or use the local CLI.');
  }, 15000);
  try {
    const buffer = await file.arrayBuffer();
    if (run !== generation) return;
    worker = new Worker('/checker.worker.js', { type: 'module' });
    worker.onmessage = ({ data }) => {
      if (run !== generation) return;
      if (data.type === 'error') return fail(data.message);
      if (data.type === 'result') {
        clearTimeout(timer);
        completed = true;
        $('check').disabled = false;
        $('check').textContent = 'Check again';
        reportPanel.setAttribute('aria-busy', 'false');
        renderSummary(data);
      } else if (data.type === 'page' && data.requestId === pageRequest) {
        renderPage(data);
      } else if (data.type === 'export' && completed) {
        const url = URL.createObjectURL(data.blob);
        downloadUrls.add(url);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'billcheck-report.json';
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => { URL.revokeObjectURL(url); downloadUrls.delete(url); }, 10000);
        $('download').disabled = false;
        announce('Report downloaded. It includes findings and the selected file name.');
      }
    };
    worker.onerror = event => {
      event.preventDefault();
      if (run === generation) fail('The checker could not start. Reload this page and select your file again.');
    };
    worker.postMessage({ type: 'check', buffer, fileName: file.name, tolerance }, [buffer]);
  } catch {
    if (run === generation) fail('The browser could not read this file. Select it again and retry.');
  }
}

function setIcon(container, kind) {
  const paths = {
    pass: ['M5 12l4 4L19 6'],
    warn: ['m12 3 10 18H2z', 'M12 9v5M12 17v1'],
    fail: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M12 7v6M12 16v1'],
    wait: ['M12 3a9 9 0 1 0 9 9'],
    file: ['M6 2h8l5 5v15H6zM14 2v6h5M9 13h7M9 17h5'],
  };
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  for (const d of paths[kind]) {
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  container.replaceChildren(svg);
}

function renderSummary({ status, summary }) {
  showState('results');
  const { errorCount, warningCount, recordCount, invoiceCount } = summary;
  const title = errorCount ? `${errorCount} error${errorCount === 1 ? '' : 's'} to resolve`
    : warningCount ? `${warningCount} warning${warningCount === 1 ? '' : 's'} to review` : 'No issues found';
  $('result-title').textContent = title;
  $('result-counts').textContent = `${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'} / ${recordCount} record${recordCount === 1 ? '' : 's'} checked`;
  $('status-icon').className = `status-icon ${status}`;
  setIcon($('status-icon'), status);
  $('result-note').textContent = status === 'pass'
    ? 'This file passed the implemented checks. This does not guarantee portal acceptance.'
    : 'Review each finding and update the original file in your billing system. Then check it again.';
  $('all-count').textContent = errorCount + warningCount;
  $('error-count').textContent = errorCount;
  $('warning-count').textContent = warningCount;
  currentFilter = 'all';
  currentPage = 0;
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === 'all')));
  $('result-summary').focus({ preventScroll: !window.matchMedia('(max-width: 740px)').matches });
  announce(`${title}. ${$('result-counts').textContent}.`);
}

function textNode(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function renderIssue(item, index) {
  const details = document.createElement('details');
  details.className = 'issue';
  const summary = document.createElement('summary');
  const severity = textNode('span', item.severity === 'error' ? 'Error' : 'Warning', `severity ${item.severity}`);
  const title = textNode('span', item.message, 'issue-title');
  const context = [];
  if (item.record !== undefined) context.push(`Record ${item.record}`);
  if (item.line !== undefined) context.push(`Line ${item.line}`);
  const location = textNode('span', context.join(' / ') || 'File structure', 'issue-location');
  const heading = document.createElement('span');
  heading.className = 'issue-heading';
  heading.append(title, location);
  summary.append(severity, heading);
  const content = document.createElement('div');
  content.className = 'issue-content';
  if (item.field) content.append(textNode('code', item.field, 'field-name'));
  content.append(textNode('p', item.explanation), textNode('h3', 'How to resolve it'), textNode('p', item.suggestion));
  if (item.expected !== undefined || item.actual !== undefined) {
    const amounts = document.createElement('dl');
    amounts.className = 'amounts';
    for (const [label, value] of [['Expected', item.expected], ['In file', item.actual]]) {
      if (value !== undefined) {
        const pair = document.createElement('div');
        pair.append(textNode('dt', label), textNode('dd', value));
        amounts.append(pair);
      }
    }
    content.append(amounts);
  }
  const reference = textNode('p', '', 'reference');
  if (item.line !== undefined) reference.append(textNode('span', `Line ${item.line}${item.column !== undefined ? `, column ${item.column}` : ''}`));
  reference.append(textNode('code', item.code));
  if (item.locCode !== undefined) reference.append(textNode('span', `Related LOC code [${item.locCode}]`, 'loc-code'));
  if (item.source.startsWith('https://ledes.org/')) {
    const link = textNode('a', 'Source specification');
    link.href = item.source;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.referrerPolicy = 'no-referrer';
    reference.append(link);
  } else reference.append(textNode('span', 'billcheck validation policy'));
  content.append(reference);
  details.append(summary, content);
  details.id = `finding-${currentPage * 50 + index + 1}`;
  return details;
}

function renderPage({ diagnostics, total, pageNumber, filter }) {
  currentPage = pageNumber;
  currentFilter = filter;
  $('findings').replaceChildren(...diagnostics.map(renderIssue));
  if (!diagnostics.length) {
    $('findings').append(textNode('p', filter === 'all' ? 'Nothing to resolve in the implemented checks.' : `No ${filter === 'error' ? 'errors' : 'warnings'} in this report.`, 'no-findings'));
  }
  $('pagination').hidden = total <= 50;
  $('page-label').textContent = `${pageNumber * 50 + 1}–${Math.min((pageNumber + 1) * 50, total)} of ${total} findings`;
  $('previous').disabled = pageNumber === 0;
  $('next').disabled = (pageNumber + 1) * 50 >= total;
  if (focusPage) {
    $('findings').querySelector('summary')?.focus();
    focusPage = false;
  }
  if (pageRequest) announce(total ? $('page-label').textContent : `No ${filter === 'error' ? 'errors' : 'warnings'} in this report.`);
}

function requestPage(filter, pageNumber, moveFocus = false) {
  if (!completed || !worker) return;
  focusPage = moveFocus;
  currentFilter = filter;
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  worker.postMessage({ type: 'page', filter, pageNumber, requestId: ++pageRequest });
}

$('choose').addEventListener('click', () => input.click());
input.addEventListener('change', () => {
  const file = input.files?.[0];
  input.value = '';
  if (file) void chooseFile(file);
});
$('example-bad').addEventListener('click', () => void chooseFile(sampleFile(true), true));
$('example-good').addEventListener('click', () => void chooseFile(sampleFile(false), true));
$('check').addEventListener('click', () => void check());
$('clear').addEventListener('click', () => clearFile());
$('tolerance').addEventListener('input', () => {
  $('tolerance-error').hidden = true;
  $('tolerance').removeAttribute('aria-invalid');
  if (!selected) return;
  stopWork();
  $('check').disabled = false;
  $('check').textContent = 'Check invoice';
  pending('Ready to check again', 'Your settings changed. Check the invoice to see an updated report.');
});
filters.forEach(button => button.addEventListener('click', () => requestPage(button.dataset.filter, 0)));
$('previous').addEventListener('click', () => requestPage(currentFilter, currentPage - 1, true));
$('next').addEventListener('click', () => requestPage(currentFilter, currentPage + 1, true));
$('download').addEventListener('click', () => {
  if (!completed || !worker) return;
  $('download').disabled = true;
  worker.postMessage({ type: 'export' });
});
for (const type of ['dragenter', 'dragover']) $('drop-zone').addEventListener(type, event => {
  event.preventDefault();
  $('drop-zone').classList.add('drag-over');
});
$('drop-zone').addEventListener('dragleave', () => $('drop-zone').classList.remove('drag-over'));
$('drop-zone').addEventListener('drop', event => {
  event.preventDefault();
  $('drop-zone').classList.remove('drag-over');
  const files = event.dataTransfer?.files;
  if (files?.length === 1) void chooseFile(files[0]);
  else fail('Choose one file at a time. Multiple files and folders are not supported.');
});
// Dropping outside the picker must not navigate away and expose an invoice as a page.
window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());
window.addEventListener('pagehide', () => clearFile(false));

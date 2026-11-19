import { LEDES_1998B_FIELDS } from './dist/index.js';

// Entirely fictitious data. These examples demonstrate behavior, not customer evidence.
const row = ['20261101', 'INV-001', '0007', '0002', '12.3400', '20261001', '20261031', 'Example legal work',
  '001', 'F', '0.1000', '', '12.3400', '20261015', 'L110', '', 'A101', '0009', 'Review file', '123',
  '123.4000', 'Doe, Jane', 'ASSOC', ''];

export function sampleFile(withIssues) {
  const fields = [...row];
  if (withIssues) { fields[0] = '20260229'; fields[4] = '99'; }
  const content = `LEDES1998B[]\r\n${LEDES_1998B_FIELDS.join('|')}[]\r\n${fields.join('|')}[]\r\n`;
  return new File([content], withIssues ? 'example-with-issues.txt' : 'example-passing.txt', { type: 'text/plain' });
}

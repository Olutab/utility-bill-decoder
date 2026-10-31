import fs from 'fs';

const REQUIRED_FIELDS = ['id', 'slug', 'entity_name', 'category', 'summary_fact', 'auditing_status'];
const VALID_CATEGORIES = ['RATE_SCHEDULE', 'UTILITY_HUB', 'STATE_CONTEXT', 'LINE_ITEM', 'PLAN_PATTERN', 'COMPARISON', 'TOOL_PAGE'];
const VALID_STATUSES = ['SOURCED', 'ESTIMATED', 'UNVERIFIED-DRAFT'];

const filePath = 'data/matrix.txt';
const raw = fs.readFileSync(filePath, 'utf8');
const lines = raw.split('\n').filter(l => l.trim() !== '');
const headers = lines[0].split('|');
const rows = lines.slice(1).map(line => {
  const cols = line.split('|');
  return headers.reduce((obj, h, i) => ({ ...obj, [h]: cols[i] || '' }), {});
});

const slugs = new Set();
const errors = [];

rows.forEach((row, i) => {
  const lineNum = i + 2;

  // 1. Duplicate slugs
  if (slugs.has(row.slug)) errors.push(`Line ${lineNum}: Duplicate slug '${row.slug}'`);
  slugs.add(row.slug);

  // 2. Missing required fields
  REQUIRED_FIELDS.forEach(f => {
    if (!row[f] || row[f] === 'NA') errors.push(`Line ${lineNum}: Missing required field '${f}'`);
  });

  // 3. Enum validation
  if (!VALID_CATEGORIES.includes(row.category)) errors.push(`Line ${lineNum}: Invalid category '${row.category}'`);
  if (!VALID_STATUSES.includes(row.auditing_status)) errors.push(`Line ${lineNum}: Invalid status '${row.auditing_status}'`);

  // 4. SOURCED rows must have a source_url
  if (row.auditing_status === 'SOURCED' && (!row.source_url || row.source_url === 'NA')) {
    errors.push(`Line ${lineNum}: Status is SOURCED but missing source_url.`);
  }

  // 5. Summary length sanity check
  if (row.summary_fact.length < 40 || row.summary_fact.length > 160) {
    errors.push(`Line ${lineNum}: summary_fact length (${row.summary_fact.length}) outside 40-160 char bounds.`);
  }
});

if (errors.length > 0) {
  console.error('\n❌ VALIDATION FAILED — ' + errors.length + ' error(s):');
  errors.forEach(e => console.error('  - ' + e));
  process.exit(1);
}

console.log(`✅ Matrix valid: ${rows.length} rows passed.`);
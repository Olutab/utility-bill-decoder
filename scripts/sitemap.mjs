import fs from 'fs';

// 1. Read the data to check for noindex pages
const raw = fs.readFileSync('data/matrix.txt', 'utf8');
const lines = raw.split('\n').filter(l => l.trim() !== '');
const headers = lines[0].split('|');
const rows = lines.slice(1).map(line => {
  const cols = line.split('|');
  return headers.reduce((obj, h, i) => ({ ...obj, [h]: cols[i] || '' }), {});
});

// 2. Define which pages are indexable
const indexableSlugs = new Set();

// Data pages are indexable UNLESS they are thin or unverified
rows.forEach(row => {
  const isThin = row.summary_fact.length < 50 || row.primary_lever === 'NA';
  if (row.auditing_status !== 'UNVERIFIED-DRAFT' && !isThin) {
    indexableSlugs.add(`${row.slug}.html`);
  }
});

// Standard pages are always indexable
['about.html', 'contact.html', 'privacy.html', 'faq.html', 'expert-advice.html', 'bill-terms.html', 'rate-patterns.html', 'index.html', 'tool/index.html'].forEach(slug => {
  indexableSlugs.add(slug);
});

// 3. Generate the XML
const baseUrl = 'https://YOUR-DOMAIN.com'; // Updated in Phase 5
const today = new Date().toISOString().split('T')[0];

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

indexableSlugs.forEach(slug => {
  xml += `  <url>
    <loc>${baseUrl}/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${slug === 'index.html' ? '1.0' : '0.8'}</priority>
  </url>
`;
});

xml += `</urlset>`;

fs.writeFileSync('dist/sitemap.xml', xml, 'utf8');
console.log(`✅ Sitemap generated with ${indexableSlugs.size} indexable URLs.`);
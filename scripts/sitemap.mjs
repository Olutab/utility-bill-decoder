import fs from 'fs';

function parseFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim() !== '');
  if (lines.length <= 1) return [];
  const headers = lines[0].split('|');
  return lines.slice(1).map(line => {
    const cols = line.split('|');
    return headers.reduce((obj, h, i) => ({ ...obj, [h]: cols[i] || '' }), {});
  });
}

const rows = [...parseFile('data/matrix.txt'), ...parseFile('data/urdb_rates.txt')];
const indexableSlugs = new Set();

rows.forEach(row => {
  const isThin = row.summary_fact.length < 50 || row.primary_lever === 'NA';
  if (row.auditing_status !== 'UNVERIFIED-DRAFT' && !isThin) {
    indexableSlugs.add(`${row.slug}.html`);
  }
});

['about.html','contact.html','privacy.html','faq.html','expert-advice.html','bill-terms.html','rate-patterns.html','index.html','tool/index.html']
  .forEach(s => indexableSlugs.add(s));

const baseUrl = 'https://all-utility.netlify.app';
const today = new Date().toISOString().split('T')[0];

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
indexableSlugs.forEach(slug => {
  xml += `  <url>\n    <loc>${baseUrl}/${slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${slug === 'index.html' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
});
xml += `</urlset>`;

fs.writeFileSync('dist/sitemap.xml', xml, 'utf8');
console.log(`✅ Sitemap generated with ${indexableSlugs.size} indexable URLs.`);
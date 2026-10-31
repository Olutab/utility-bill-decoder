import fs from 'fs';

// 1. Read data
const raw = fs.readFileSync('data/matrix.txt', 'utf8');
const lines = raw.split('\n').filter(l => l.trim() !== '');
const headers = lines[0].split('|');
const rows = lines.slice(1).map(line => {
  const cols = line.split('|');
  return headers.reduce((obj, h, i) => ({ ...obj, [h]: cols[i] || '' }), {});
});

// 2. Create OG directory
if (!fs.existsSync('dist/og')) {
  fs.mkdirSync('dist/og');
}

// 3. SVG Template (Blueprint Style)
function createOgSvg(title, category) {
  // Truncate long titles for the image
  const shortTitle = title.length > 45 ? title.substring(0, 42) + '...' : title;
  const catText = category ? category.replace('_', ' ') : 'UTILITY BILL DECODER';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1200" height="630" fill="#EEF2F6" />
  
  <!-- Blueprint Grid -->
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0B5FA5" stroke-width="0.5" opacity="0.15"/>
  </pattern>
  <rect width="1200" height="630" fill="url(#grid)" />
  
  <!-- Dark Blue Panel -->
  <rect x="80" y="80" width="1040" height="470" fill="#10243A" />
  <rect x="80" y="80" width="1040" height="470" fill="none" stroke="#0B5FA5" stroke-width="4" />
  
  <!-- Corner Marks -->
  <path d="M 70 90 L 70 70 L 90 70" fill="none" stroke="#0B5FA5" stroke-width="3" />
  <path d="M 1110 70 L 1130 70 L 1130 90" fill="none" stroke="#0B5FA5" stroke-width="3" />
  <path d="M 70 540 L 70 560 L 90 560" fill="none" stroke="#0B5FA5" stroke-width="3" />
  <path d="M 1110 560 L 1130 560 L 1130 540" fill="none" stroke="#0B5FA5" stroke-width="3" />

  <!-- Category Label -->
  <text x="130" y="160" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#7FB4E8" letter-spacing="4">${catText}</text>
  <line x1="130" y1="175" x2="350" y2="175" stroke="#7FB4E8" stroke-width="3" />

  <!-- Main Title -->
  <text x="130" y="260" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="#FFFFFF">
    <tspan x="130" dy="0">${shortTitle.split(' ').slice(0, 4).join(' ')}</tspan>
    <tspan x="130" dy="80">${shortTitle.split(' ').slice(4).join(' ') || ''}</tspan>
  </text>

  <!-- Footer Text -->
  <text x="130" y="500" font-family="Arial, sans-serif" font-size="28" fill="#B8D4F0">Utility Bill Decoder • Commercial Energy Intelligence</text>
</svg>`;
}

// 4. Generate for Data Pages
rows.forEach(row => {
  if (row.auditing_status !== 'UNVERIFIED-DRAFT') {
    const svg = createOgSvg(row.entity_name, row.category);
    fs.writeFileSync(`dist/og/${row.slug}.svg`, svg, 'utf8');
  }
});

// 5. Generate for Standard Pages
const standardPages = ['about', 'contact', 'privacy', 'faq', 'expert-advice', 'bill-terms', 'rate-patterns', 'index'];
standardPages.forEach(slug => {
  const title = slug === 'index' ? 'Understand Your Utility Bill' : slug.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  const svg = createOgSvg(title, 'REFERENCE');
  fs.writeFileSync(`dist/og/${slug}.svg`, svg, 'utf8');
});

console.log(`✅ Generated OG images for all pages.`);
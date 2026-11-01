import fs from 'fs';
   if (!fs.existsSync('dist/comparisons')) {
     fs.mkdirSync('dist/comparisons', { recursive: true });
   }

// 1. Read data
const raw = fs.readFileSync('data/matrix.txt', 'utf8');
const lines = raw.split('\n').filter(l => l.trim() !== '');
const headers = lines[0].split('|');
const rows = lines.slice(1).map(line => {
  const cols = line.split('|');
  return headers.reduce((obj, h, i) => ({ ...obj, [h]: cols[i] || '' }), {});
});

// 2. Filter only valid RATE_SCHEDULE or PLAN_PATTERN rows
const candidates = rows.filter(r => 
  (r.category === 'RATE_SCHEDULE' || r.category === 'PLAN_PATTERN') && 
  r.auditing_status !== 'UNVERIFIED-DRAFT'
);

const diffFields = ['rate_structure', 'peak_window_local', 'demand_charge_band', 'fixed_charge_band', 'primary_lever', 'common_misread'];
const generatedPairs = new Set();

let comparisonCount = 0;

// 3. Find valid pairs
for (let i = 0; i < candidates.length; i++) {
  for (let j = i + 1; j < candidates.length; j++) {
    const a = candidates[i];
    const b = candidates[j];

    // Must be same context (same utility/state/class) to be a real choice
    const sameContext = a.utility_name === b.utility_name && a.state_code === b.state_code && a.customer_class === b.customer_class;
    
    // Must have real tension (e.g., one has demand charges, the other doesn't)
    const hasTension = ['MID', 'HIGH', 'RATCHET'].includes(a.demand_charge_band) !== ['MID', 'HIGH', 'RATCHET'].includes(b.demand_charge_band);

    if (sameContext && hasTension) {
      // Count differing fields
      const differences = diffFields.filter(f => a[f] !== 'NA' && b[f] !== 'NA' && a[f] !== b[f]).length;

      if (differences >= 5) {
        const slugA = a.slug;
        const slugB = b.slug;
        const pairKey = [slugA, slugB].sort().join('-vs-');

        if (!generatedPairs.has(pairKey)) {
          generatedPairs.add(pairKey);
          comparisonCount++;

          // Generate the HTML file
          const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${a.entity_name} vs ${b.entity_name} | Utility Bill Decoder</title>
  <meta name="description" content="Comparing ${a.entity_name} and ${b.entity_name}. See the key differences in demand charges, peak windows, and which is better for your business.">
  <link rel="canonical" href="https://all-utility.netlify.app/comparisons/${pairKey}.html">
  <link rel="stylesheet" href="../site-assets/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700&family=Newsreader:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
  <nav class="site-nav">
    <div class="brand">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
      <span class="brand-name">Bill Decoder</span>
    </div>
    <a href="../index.html" class="nav-link">← Back to Home</a>
  </nav>
  <main class="sheet">
    <p class="fig">COMPARISON ANALYSIS</p>
    <h1>${a.entity_name} vs ${b.entity_name}</h1>
    <p class="answer">Both are commercial rate structures, but they behave very differently. <strong>${a.entity_name}</strong> is best for ${a.primary_lever.replace('_', ' ').toLowerCase()}, while <strong>${b.entity_name}</strong> favors ${b.primary_lever.replace('_', ' ').toLowerCase()}.</p>
    
    <table>
      <thead>
        <tr>
          <th>Feature</th>
          <th>${a.entity_name}</th>
          <th>${b.entity_name}</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>Rate Structure</strong></td><td>${a.rate_structure.replace('_', ' ')}</td><td>${b.rate_structure.replace('_', ' ')}</td></tr>
        <tr><td><strong>Peak Window</strong></td><td>${a.peak_window_local}</td><td>${b.peak_window_local}</td></tr>
        <tr><td><strong>Demand Charge Band</strong></td><td>${a.demand_charge_band}</td><td>${b.demand_charge_band}</td></tr>
        <tr><td><strong>Fixed Charge Band</strong></td><td>${a.fixed_charge_band}</td><td>${b.fixed_charge_band}</td></tr>
        <tr><td><strong>Primary Action Lever</strong></td><td>${a.primary_lever.replace('_', ' ')}</td><td>${b.primary_lever.replace('_', ' ')}</td></tr>
        <tr><td><strong>Common Misread</strong></td><td>${a.common_misread}</td><td>${b.common_misread}</td></tr>
      </tbody>
    </table>

    <div class="callout">
      <h3>🎯 The Verdict</h3>
      <p>If your business has ${a.demand_charge_band === 'NONE' ? 'low, steady usage without heavy equipment spikes' : 'high, concentrated usage during peak hours'}, <strong>${a.demand_charge_band === 'NONE' ? a.entity_name : b.entity_name}</strong> will likely save you money. Always verify your specific load profile before requesting a rate change from your utility.</p>
    </div>

    <div style="margin-top: 40px; padding-top: 32px; border-top: 2px solid var(--line);">
      <p style="font-size: 0.95rem; color: var(--ink-soft);">
        <a href="../index.html">← Back to Home</a> | 
        <a href="../tool/index.html">🛠️ Analyze Your Own Bill</a>
      </p>
    </div>
  </main>
</body>
</html>`;
          
          fs.writeFileSync(`dist/comparisons/${pairKey}.html`, html, 'utf8');
        }
      }
    }
  }
}

console.log(`✅ Generated ${comparisonCount} high-value comparison pages.`);
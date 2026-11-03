import fs from 'fs';
import { marked } from 'marked';

const GOOGLE_VERIFY = '<meta name="google-site-verification" content="Esl2MXvFiQBS6xZwCQSEQwKdE_mYnsAHNilOoBW1mxo" />';
// 1. Read and parse the data
// 1. Read and parse BOTH data files
function parseFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim() !== '');
  if (lines.length <= 1) return []; // Empty or header only
  const headers = lines[0].split('|');
  return lines.slice(1).map(line => {
    const cols = line.split('|');
    return headers.reduce((obj, h, i) => ({ ...obj, [h]: cols[i] || '' }), {});
  });
}

const manualRows = parseFile('data/matrix.txt');
const urdbRows = parseFile('data/urdb_rates.txt');
const rows = [...manualRows, ...urdbRows]; // Combine them!

console.log(`📊 Loaded ${manualRows.length} manual rows and ${urdbRows.length} URDB rows.`);

// 2. Create the output folder and copy the design system
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}
fs.cpSync('site-assets', 'dist/site-assets', { recursive: true });
if (fs.existsSync('robots.txt')) fs.copyFileSync('robots.txt', 'dist/robots.txt');

// 3. SEO & Content Helpers
function getSEO(row) {
  const base = " | Utility Bill Decoder";
  if (row.category === 'LINE_ITEM') return {
    title: `What is ${row.entity_name}?${base}`,
    desc: `${row.summary_fact} Learn how to read this charge on your commercial bill.`
  };
  if (row.category === 'PLAN_PATTERN') return {
    title: `${row.entity_name} Explained${base}`,
    desc: `How ${row.entity_name} works, who it's for, and the hidden risks to watch out for.`
  };
  return { title: `${row.entity_name}${base}`, desc: row.summary_fact };
}

// 4. PROSE ENGINE
const openers = [
  (r) => `${r.entity_name} is ${r.summary_fact.toLowerCase()} On a commercial bill, this line typically indicates ${r.primary_lever.replace('_', ' ').toLowerCase()} exposure.`,
  (r) => `When you see ${r.entity_name} on your statement, it means ${r.summary_fact.toLowerCase()} This directly impacts your ${r.primary_lever.replace('_', ' ').toLowerCase()} strategy.`,
  (r) => `Understanding ${r.entity_name} is critical. ${r.summary_fact} Most owners miss how this affects their ${r.primary_lever.replace('_', ' ').toLowerCase()} exposure.`
];

const misreadStarters = [
  (r) => `The most common mistake is assuming ${r.common_misread.toLowerCase()} In reality, the billing structure separates these mechanics to reflect grid realities.`,
  (r) => `Business owners frequently believe ${r.common_misread.toLowerCase()} This is incorrect because utilities calculate this based on infrastructure load, not just your usage.`,
  (r) => `It is easy to misread this as ${r.common_misread.toLowerCase()} However, this charge is designed to recover specific costs unrelated to your total volume.`
];

// 5. INTERNAL LINKING
function getRelatedLinks(row) {
  const related = rows.filter(r => 
    r.slug !== row.slug && 
    r.auditing_status !== 'UNVERIFIED-DRAFT' &&
    (r.primary_lever === row.primary_lever || r.customer_class === row.customer_class)
  ).slice(0, 3);

  if (related.length === 0) return '';
  const links = related.map(r => `<li><a href="${r.slug}.html">${r.entity_name}</a></li>`).join('');
  return `
    <section class="related-links">
      <p class="fig">RELATED CONCEPTS</p>
      <h3>See Also</h3>
      <ul>${links}</ul>
    </section>
  `;
}

// 6. UNIQUE MODULES
function getWorkedScenario(row) {
  if (row.demand_charge_band !== 'NA' && row.demand_charge_band !== 'NONE') {
    return `<div class="callout"><h3>🧮 Worked Scenario</h3><p>If your facility has a peak demand of 50kW and your tariff charges $10/kW (typical for a ${row.demand_charge_band} band), that single line item costs you <strong>$500/month</strong>, regardless of how many kWh you actually use.</p></div>`;
  }
  return `<div class="callout"><h3>🧮 Worked Scenario</h3><p>If your monthly bill is $1,000 and you used 5,000 kWh, your blended effective rate is 20¢/kWh. If this ${row.entity_name} increases by 10%, your total bill rises to $1,100 even if your usage stays exactly the same.</p></div>`;
}

// 7. Shared Layout Components
const logoSVG = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`;

function getNav() {
  const link = (href, text, isBtn = false) => `<a href="${href}" class="${isBtn ? 'btn-tool' : ''}">${text}</a>`;
  return `<nav class="site-nav"><div class="brand">${logoSVG}<span class="brand-name">Bill Decoder</span></div>${link('index.html', 'Home')}${link('bill-terms.html', 'Bill Terms')}${link('faq.html', 'FAQ')}${link('tool/index.html', '🛠️ Decoder Tool', true)}</nav>`;
}

function getFooter() {
  return `<footer class="site-footer">
    <div class="footer-inner">
      <div>
        <h3>Explore</h3>
        <ul>
          <li><a href="index.html">Home</a></li>
          <li><a href="bill-terms.html">Bill Terms</a></li>
          <li><a href="rate-patterns.html">Rate Patterns</a></li>
          <li><a href="research-index.html">Demand Charge Index</a></li> <!-- NEW -->
        </ul>
      </div>
      <div>
        <h3>Company</h3>
        <ul>
          <li><a href="about.html">About Us</a></li>
          <li><a href="expert-advice.html">Expert Advice</a></li>
          <li><a href="contact.html">Contact</a></li>
          <li><a href="changelog.html">Changelog</a></li> <!-- NEW -->
        </ul>
      </div>
      <div>
        <h3>Legal</h3>
        <ul>
          <li><a href="privacy.html">Privacy Policy</a></li>
          <li><a href="faq.html">FAQ</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-fine">
      &copy; ${new Date().getFullYear()} Utility Bill Decoder. All data sourced from public records or clearly labeled estimates.
    </div>
  </footer>`;
}
// 8. Page Generators
function generateDataPage(row) {
  if (row.auditing_status === 'UNVERIFIED-DRAFT') return null;
  
  const isThin = row.summary_fact.length < 50 || row.primary_lever === 'NA';
  const noIndexTag = isThin ? '<meta name="robots" content="noindex">' : '';
  const seo = getSEO(row);
  
  const openerFn = openers[row.id.length % openers.length];
  const misreadFn = misreadStarters[row.id.length % misreadStarters.length];
  const openingAnswer = openerFn(row);
  const misreadText = misreadFn(row);

  let structuralContext = '';
  if (row.category === 'LINE_ITEM') {
    structuralContext = `<p>Utilities impose this specific charge to recover the capital and operational costs of maintaining grid reliability. For ${row.primary_lever.replace('_', ' ').toLowerCase()} scenarios, this ensures the infrastructure can handle sudden spikes in demand without causing localized brownouts or requiring expensive emergency power purchases.</p>`;
    } else if (row.category === 'RATE_SCHEDULE') {
    structuralContext = `<p>This specific tariff is filed by ${row.utility_name} with the ${row.state_code} public utility commission. It dictates exactly how your facility's energy and demand consumption is priced, and serves as the legal basis for your monthly commercial billing.</p>`;
  } else {
    structuralContext = `<p>This classification is used by public utility commissions to standardize billing practices across similar facility types, ensuring equitable cost distribution among all ratepayers in the service territory.</p>`;
  }

  const billIdentificationTip = row.category === 'LINE_ITEM' 
    ? `<p><strong>How to spot this:</strong> Look on page 2 or 3 of your PDF bill under sections labeled "Detailed Charges," "Tariff Schedule," or "Riders." It may appear abbreviated (e.g., "Dem Chg" or "Fac Chg").</p>`
    : `<p><strong>How to spot this:</strong> Check the top right corner of your bill for "Rate Schedule" or "Service Classification." Common codes include "GS-2", "E-19", or "Large TOU".</p>`;

  const eeatBlock = `
    <div class="eeat-block">
      <p class="fig">DATA & VERIFICATION</p>
      <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9rem; color: var(--ink-soft);">
        <li><strong>Primary Source:</strong> ${row.source_name !== 'NA' ? row.source_name : 'Internal Archetype Definition'} 
          ${row.source_url !== 'NA' ? `(<a href="${row.source_url}" target="_blank" rel="noopener">View Official Document</a>)` : ''}
        </li>
        <li><strong>Last Verified:</strong> ${row.last_checked !== 'NA' ? row.last_checked : 'N/A'}</li>
        <li><strong>Review Status:</strong> ${row.auditing_status === 'SOURCED' ? 'Verified against public utility commission filings.' : 'Estimated based on standard industry rate-design taxonomy.'}</li>
      </ul>
    </div>
  `;

  const isAbstract = row.category === 'LINE_ITEM' || row.category === 'PLAN_PATTERN';
  const hero = isAbstract 
    ? `<div class="hero-panel"><svg width="80" height="80" viewBox="0 0 100 100" style="stroke: var(--accent); stroke-width: 2; fill: none;"><rect x="10" y="10" width="80" height="80" /><line x1="10" y1="50" x2="90" y2="50" /><line x1="50" y1="10" x2="50" y2="90" /></svg><div><p class="fig">FIG. 01 — SCHEMATIC</p><p class="hero-caption">Visual representation of ${row.entity_name} mechanics.</p></div></div>`
    : `<div class="hero-panel"><p class="fig">FIG. 01 — REFERENCE IMAGE</p><p class="hero-caption">[ Photo: ${row.image_query} ]</p></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${GOOGLE_VERIFY}
  <title>${seo.title}</title>
  <meta name="description" content="${seo.desc}">
  <link rel="canonical" href="https://all-utility.netlify.app/${row.slug}.html">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${seo.title}">
  <meta property="og:description" content="${seo.desc}">
  <meta property="og:image" content="https://all-utility.netlify.app/og/${row.slug}.svg">
  ${noIndexTag}
  <link rel="stylesheet" href="site-assets/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700&family=Newsreader:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
  ${getNav()}
  <main class="sheet">
    <span class="meta-badge">${row.category.replace('_', ' ')}</span>
    <h1>${row.entity_name}</h1>
    ${hero}
    <div class="answer"><strong>The Short Answer:</strong> ${openingAnswer}</div>
    <section>
      <p class="fig">FIG. 02 — STRUCTURAL CONTEXT</p>
      <h2>Why Utilities Use This Model</h2>
      ${structuralContext}
    </section>
    ${getWorkedScenario(row)}
    <section>
      <p class="fig">FIG. 03 — COMMON ERRORS</p>
      <h2>The Common Misread</h2>
      <p>${misreadText}</p>
      ${billIdentificationTip}
    </section>
    <div class="callout">
      <h3>🎯 Your One Action This Week</h3>
      <p>Focus on <strong>${row.primary_lever.replace('_', ' ').toLowerCase()}</strong>. Review your last two bills to see if this specific lever is driving your costs.</p>
    </div>
    ${eeatBlock}
    ${getRelatedLinks(row)}
  </main>
  ${getFooter()}
</body>
</html>`;
}

function generateStandardPage(page) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${GOOGLE_VERIFY}
  <title>${page.title} | Utility Bill Decoder</title>
  <meta name="description" content="${page.title} page for Utility Bill Decoder.">
  <link rel="canonical" href="https://all-utility.netlify.app/${page.slug}.html">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${page.title} | Utility Bill Decoder">
  <meta property="og:description" content="Understand your commercial energy bill with Utility Bill Decoder.">
  <meta property="og:image" content="https://all-utility.netlify.app/og/${page.slug}.svg">
  <link rel="stylesheet" href="site-assets/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700&family=Newsreader:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
  ${getNav()}
  <main class="sheet">
    <h1>${page.title}</h1>
    ${page.content}
  </main>
  ${getFooter()}
</body>
</html>`;
}

function generateBillTermsPage() {
  const lineItems = rows.filter(r => r.category === 'LINE_ITEM' && r.auditing_status !== 'UNVERIFIED-DRAFT');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${GOOGLE_VERIFY}
  <title>Bill Terms Glossary | Utility Bill Decoder</title>
  <meta name="description" content="Complete glossary of commercial utility bill line items: demand charges, energy charges, riders, and fees explained.">
  <link rel="canonical" href="https://all-utility.netlify.app/bill-terms.html">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Bill Terms Glossary | Utility Bill Decoder">
  <meta property="og:description" content="Complete glossary of commercial utility bill line items.">
  <meta property="og:image" content="https://all-utility.netlify.app/og/bill-terms.svg">
  <link rel="stylesheet" href="site-assets/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700&family=Newsreader:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
  ${getNav()}
  <main class="sheet">
    <p class="fig">REFERENCE</p>
    <h1>Bill Terms Glossary</h1>
    <p class="section-intro">Every line item that can appear on a commercial utility bill, explained in plain language with optimization strategies.</p>
    <ul class="card-grid" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
      ${lineItems.map(r => `<li class="card" style="height: auto;"><a href="${r.slug}.html">${r.entity_name}</a><p>${r.summary_fact}</p><p style="margin-top: 12px; font-size: 0.85rem; color: var(--accent);"><strong>Action:</strong> ${r.primary_lever.replace('_', ' ')}</p></li>`).join('')}
    </ul>
    <div style="margin-top: 40px; padding-top: 32px; border-top: 2px solid var(--line);"><p style="font-size: 0.95rem; color: var(--ink-soft);"><a href="index.html">← Back to Home</a></p></div>
  </main>
  ${getFooter()}
</body>
</html>`;
}

function generateRatePatternsPage() {
  const patterns = rows.filter(r => r.category === 'PLAN_PATTERN' && r.auditing_status !== 'UNVERIFIED-DRAFT');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${GOOGLE_VERIFY}
  <title>Rate Patterns | Utility Bill Decoder</title>
  <meta name="description" content="Commercial rate structures explained: flat rates, time-of-use, demand charges, and ratchet clauses.">
  <link rel="canonical" href="https://all-utility.netlify.app/rate-patterns.html">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Rate Patterns | Utility Bill Decoder">
  <meta property="og:description" content="Commercial rate structures explained.">
  <meta property="og:image" content="https://all-utility.netlify.app/og/rate-patterns.svg">
  <link rel="stylesheet" href="site-assets/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700&family=Newsreader:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
  ${getNav()}
  <main class="sheet">
    <p class="fig">REFERENCE</p>
    <h1>Commercial Rate Patterns</h1>
    <p class="section-intro">Different rate structures used by utilities. Understanding which pattern you're on is the first step to optimization.</p>
    <ul class="card-grid" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
      ${patterns.map(r => `<li class="card" style="height: auto;"><a href="${r.slug}.html">${r.entity_name}</a><p>${r.summary_fact}</p><p style="margin-top: 12px; font-size: 0.85rem; color: var(--accent);"><strong>Best for:</strong> ${r.primary_lever.replace('_', ' ')}</p></li>`).join('')}
    </ul>
    <div style="margin-top: 40px; padding-top: 32px; border-top: 2px solid var(--line);"><p style="font-size: 0.95rem; color: var(--ink-soft);"><a href="index.html">← Back to Home</a></p></div>
  </main>
  ${getFooter()}
</body>
</html>`;
}

function generateIndex() {
  const lineItems = rows.filter(r => r.category === 'LINE_ITEM' && r.auditing_status !== 'UNVERIFIED-DRAFT');
  const patterns = rows.filter(r => r.category === 'PLAN_PATTERN' && r.auditing_status !== 'UNVERIFIED-DRAFT');
  const makeCard = (r) => `<li class="card"><a href="${r.slug}.html">${r.entity_name}</a><p>${r.summary_fact}</p></li>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${GOOGLE_VERIFY}
  <title>Utility Bill Decoder: Commercial Energy Bill Analysis</title>
  <meta name="description" content="Professional-grade utility bill analysis for small business owners. Understand demand charges, rate structures, and optimize your commercial energy costs.">
  <link rel="canonical" href="https://all-utility.netlify.app/index.html">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Utility Bill Decoder: Commercial Energy Bill Analysis">
  <meta property="og:description" content="Professional-grade utility bill analysis for small business owners.">
  <meta property="og:image" content="https://all-utility.netlify.app/og/index.svg">
  <link rel="stylesheet" href="site-assets/style.css">
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700&family=Newsreader:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
  ${getNav()}
  <main>
    <section class="hero-section">
      <div class="hero-content">
        <p class="fig">COMMERCIAL ENERGY INTELLIGENCE</p>
        <h1>Understand Your Utility Bill in Minutes</h1>
        <p class="hero-sub">Commercial energy bills contain over 30 line items and complex rate structures. Our decoder analyzes your bill, identifies cost drivers, and reveals optimization opportunities specific to your business.</p>
        <div class="hero-cta">
          <a href="tool/index.html" class="btn btn-primary btn-large">Analyze Your Bill</a>
          <p class="hero-note">Free tool • No registration • Processes locally in your browser</p>
        </div>
      </div>
      <div class="hero-visual">
        <div class="bill-mockup">
          <div class="bill-line"><span class="label">Total Monthly Charges</span><span class="value">$1,247.83</span></div>
          <div class="bill-line highlight"><span class="label">Demand Charge (Peak kW)</span><span class="value">$412.00</span><span class="badge">OPTIMIZABLE</span></div>
          <div class="bill-line"><span class="label">Energy Consumption</span><span class="value">$520.40</span></div>
          <div class="bill-line"><span class="label">Fixed Service Charges</span><span class="value">$85.00</span></div>
        </div>
      </div>
    </section>
    <section class="problem-section">
      <div class="sheet">
        <p class="fig">THE CHALLENGE</p>
        <h2>Commercial Energy Billing Complexity</h2>
        <div class="problem-grid">
          <div class="problem-card"><h3>Complex Rate Structures</h3><p>Most businesses are on default rate schedules that don't match their usage patterns, resulting in 15-40% higher costs than necessary.</p></div>
          <div class="problem-card"><h3>Demand Charges</h3><p>A single 15-minute peak demand period can account for 40-60% of your total bill, regardless of overall consumption.</p></div>
          <div class="problem-card"><h3>Hidden Fees & Riders</h3><p>Regulatory adjustments, fuel cost adjustments, and franchise fees can add 8-15% to your bill without clear explanation.</p></div>
        </div>
      </div>
    </section>
    <section class="how-section">
      <div class="sheet">
        <p class="fig">METHODOLOGY</p>
        <h2>Three-Step Analysis Process</h2>
        <div class="steps">
          <div class="step"><div class="step-number">1</div><h3>Upload Your Bill</h3><p>Submit a PDF or clear photo of your most recent utility bill. All processing occurs locally—your data never leaves your device.</p></div>
          <div class="step"><div class="step-number">2</div><h3>Automated Analysis</h3><p>We extract key metrics: effective rate per kWh, load factor, demand charge percentage, and rate structure classification.</p></div>
          <div class="step"><div class="step-number">3</div><h3>Actionable Recommendations</h3><p>Receive specific, prioritized actions based on your usage profile: load shifting opportunities, rate plan optimization, or demand management strategies.</p></div>
        </div>
        <div class="center-cta"><a href="tool/index.html" class="btn btn-primary btn-large">Begin Analysis</a></div>
      </div>
    </section>
    <section class="preview-section">
      <div class="sheet">
        <p class="fig">REFERENCE DOCUMENTATION</p>
        <h2>Bill Component Library</h2>
        <p class="section-intro">Comprehensive explanations of commercial utility billing components, rate structures, and optimization strategies.</p>
        <h3 id="line-items">Bill Line Items</h3>
        <ul class="card-grid">${lineItems.slice(0, 6).map(makeCard).join('')}</ul>
        <p><a href="bill-terms.html" class="see-all">View All ${lineItems.length} Terms →</a></p>
        <h3 id="patterns">Rate Structures</h3>
        <ul class="card-grid">${patterns.slice(0, 4).map(makeCard).join('')}</ul>
        <p><a href="rate-patterns.html" class="see-all">View All ${patterns.length} Rate Patterns →</a></p>
      </div>
    </section>
    <section class="faq-preview">
      <div class="sheet">
        <p class="fig">TECHNICAL QUESTIONS</p>
        <h2>Frequently Asked Questions</h2>
        <div class="faq-grid">
          <div class="faq-item"><h3>Why did my bill increase despite lower consumption?</h3><p>Demand charges are calculated based on your highest 15-minute interval demand, not total monthly consumption. A single peak event can disproportionately impact your bill.</p></div>
          <div class="faq-item"><h3>What distinguishes supply from delivery charges?</h3><p>Supply represents the commodity cost of electricity generation. Delivery covers transmission and distribution infrastructure. In deregulated markets, supply may be shoppable.</p></div>
          <div class="faq-item"><h3>Can I change my rate schedule?</h3><p>Most commercial customers qualify for multiple rate schedules. Optimal selection depends on load factor, peak demand timing, and seasonal usage patterns.</p></div>
        </div>
        <div class="center-cta"><a href="faq.html" class="btn">View Complete FAQ</a></div>
      </div>
    </section>
  </main>
  ${getFooter()}
</body>
</html>`;
}

// 9. Run the Build
const standardPages = [
  { slug: 'about', title: 'About Us', content: '<h2>Our Mission</h2><p>Utility Bill Decoder was built to help small business owners understand their commercial energy bills. We believe that energy pricing shouldn\'t require an engineering degree to decipher.</p><p>We provide free tools, clear definitions, and actionable advice to help you manage your business costs effectively.</p>' },
  { slug: 'contact', title: 'Contact Us', content: '<h2>Get in Touch</h2><p>Have a question about your bill or a suggestion for a new feature? We\'d love to hear from you.</p><p><strong>Email:</strong> support@utilitybilldecoder.com</p><p><strong>Response Time:</strong> Within 48 hours on business days.</p>' },
  { slug: 'privacy', title: 'Privacy Policy', content: '<h2>Your Privacy Matters</h2><p>We do not track your personal data, and we do not sell your information.</p><h3>The Bill Decoder Tool</h3><p>When you use our Bill Decoder tool to upload a PDF or photo, <strong>the file never leaves your browser</strong>. All processing happens locally on your device. We never see your bill.</p>' },
  { slug: 'faq', title: 'Frequently Asked Questions', content: '<h2>Real Questions from Business Owners</h2><div class="faq-full"><div class="faq-item-full"><h3>Why did my bill go up 40% when I used less energy?</h3><p><strong>Short answer:</strong> Demand charges are based on your highest 15-minute usage spike, not your total monthly consumption.</p><p>If you ran your HVAC, compressor, and forklift charger at the same time for just 15 minutes, that sets your demand charge for the entire month.</p><p><strong>What to do:</strong> Stagger your equipment startups. Even 10 minutes between heavy loads can cut demand charges by 30-50%.</p></div><div class="faq-item-full"><h3>What\'s the difference between supply and delivery charges?</h3><p><strong>Supply</strong> is the cost of the electricity itself. <strong>Delivery</strong> is the cost to move it to your building.</p><p>In deregulated states, you can shop for supply separately, but delivery is fixed by your utility.</p></div><div class="faq-item-full"><h3>Can I switch to a cheaper rate plan?</h3><p><strong>Usually yes.</strong> Most businesses are on a "default" rate that their utility assigned years ago. Utilities rarely tell you when better options become available.</p></div><div class="faq-item-full"><h3>Is this tool really free? How do you make money?</h3><p><strong>Yes, it\'s free.</strong> We make money through affiliate links to energy consultants. We never sell your data. Your bills are processed locally in your browser.</p></div></div>' },
  { slug: 'expert-advice', title: 'Expert Advice', content: '<h2>When to Hire an Energy Consultant</h2><p>Our tools are great for understanding your bill and finding quick wins. However, you should consider hiring a certified energy consultant if:</p><ul><li>Your facility uses over 100,000 kWh per month.</li><li>You are planning a major renovation or equipment upgrade.</li><li>You want to install solar panels or battery storage.</li></ul>' }
];

let builtCount = 0;
let skippedCount = 0;
let noIndexCount = 0;

rows.forEach(row => {
  const html = generateDataPage(row);
  if (html) {
    fs.writeFileSync(`dist/${row.slug}.html`, html, 'utf8');
    builtCount++;
    if (row.summary_fact.length < 50 || row.primary_lever === 'NA') noIndexCount++;
  } else {
    skippedCount++;
  }
});

standardPages.forEach(page => {
  fs.writeFileSync(`dist/${page.slug}.html`, generateStandardPage(page), 'utf8');
});

fs.writeFileSync('dist/bill-terms.html', generateBillTermsPage(), 'utf8');
fs.writeFileSync('dist/rate-patterns.html', generateRatePatternsPage(), 'utf8');
fs.writeFileSync('dist/index.html', generateIndex(), 'utf8');

console.log(`✅ Build complete!`);
console.log(`   - ${builtCount} data pages generated.`);
console.log(`   - ${noIndexCount} pages marked noindex (thin content).`);
console.log(`   - ${skippedCount} pages skipped (UNVERIFIED-DRAFT).`);
console.log(`   - Design system copied to dist/site-assets.`);
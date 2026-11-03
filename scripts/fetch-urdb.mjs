import fs from 'fs';

// 1. CONFIGURATION
const API_KEY = '6NMDLmWJPwNnBFnzKd7Gkqc69FRBBKn9tHPkkr69'; 
// Start with 3 major states to test. Later, change this to all 50 states to hit 2,000+ pages.
const states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC']; 
const sector = 'Commercial';

const headers = "id|slug|entity_name|alias|category|summary_fact|source_url|source_name|last_checked|auditing_status|image_query|utility_name|state_code|customer_class|rate_structure|peak_window_local|demand_charge_band|fixed_charge_band|primary_lever|common_misread|estimate_method\n";

let allRows = [];

// Helper to create clean URLs
function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

// 2. FETCH AND MAP DATA
async function fetchRates() {
  console.log('🚀 Fetching URDB data from NREL...');

  for (const state of states) {
    const url = `https://api.openei.org/utility_rates?version=8&format=json&api_key=${API_KEY}&detail=full&country=US&state=${state}&sector=${sector}&limit=1000`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        console.log(`✅ Found ${data.items.length} commercial rates in ${state}.`);
        
        data.items.forEach(rate => {
          // Skip rates with no name or utility
          if (!rate.name || !rate.utility) return;

          const utility = rate.utility.replace(/\s+/g, ' ').trim();
          const name = rate.name.replace(/\s+/g, ' ').trim();
          const slug = `urdb-${slugify(utility)}-${slugify(name)}`;
          const id = `URDB-${rate.uri || Math.random().toString(36).substr(2, 9)}`;
          
          // Extract basic facts from the complex JSON
          const hasDemand = rate.demandratestructure && rate.demandratestructure.length > 0;
          const hasTiers = rate.energyratestructure && rate.energyratestructure.length > 1;
          
          let summary = `This is the official ${name} commercial tariff offered by ${utility} in ${state}.`;
          if (hasDemand) summary += ` It includes specific demand (kW) charges based on peak usage.`;
          if (hasTiers) summary += ` Energy charges are tiered based on total monthly volume.`;
          
          let lever = hasDemand ? 'SHAVE_PEAK' : 'REDUCE_KWH';
          let misread = hasDemand ? 'owners assume reducing total kWh will lower the demand charge, but demand is based on a single 15-minute spike.' : 'owners assume all kWh cost the same, ignoring tiered volume thresholds.';

          // Build the pipe-delimited row matching our schema
          const row = [
            id, slug, `${name} (${utility})`, `${utility} rate`, 'RATE_SCHEDULE', 
            summary, `https://openei.org/apps/IURDB/rate/view/${rate.uri}`, 'OpenEI URDB', 
            new Date().toISOString().split('T')[0], 'SOURCED', 'commercial utility meter', 
            utility, state, 'COMMERCIAL', hasTiers ? 'TIERED' : 'FLAT', 'NA', 
            hasDemand ? 'MID' : 'NONE', 'LOW', lever, misread, 'NA'
          ].join('|');
          
          allRows.push(row);
        });
      } else {
        console.log(`⚠️ No commercial rates found for ${state}.`);
      }
    } catch (error) {
      console.error(`❌ Error fetching ${state}:`, error.message);
    }
  }

  // 3. SAVE TO FILE
  if (allRows.length > 0) {
    fs.writeFileSync('data/urdb_rates.txt', headers + allRows.join('\n'), 'utf8');
    console.log(`\n🎉 SUCCESS! Generated ${allRows.length} new utility rate pages in data/urdb_rates.txt`);
  } else {
    console.log('\n❌ No data was saved. Check your API key and internet connection.');
  }
}

fetchRates();
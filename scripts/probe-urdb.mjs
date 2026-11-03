const API_KEY = '6NMDLmWJPwNnBFnzKd7Gkqc69FRBBKn9tHPkkr69';

async function probe() {
  const url = `https://api.openei.org/utility_rates?version=8&format=json&api_key=${API_KEY}&detail=full&sector=Commercial&limit=2`;
  const res = await fetch(url);
  const data = await res.json();
  const item = data.items && data.items[0];
  if (!item) { console.log('No items returned:', JSON.stringify(data).slice(0, 300)); return; }
  console.log('FIELD NAMES IN ONE RATE RECORD:');
  console.log(Object.keys(item).join(', '));
  console.log('---');
  console.log('utility:', item.utility);
  console.log('name:', item.name);
  console.log('state value:', 'state' in item ? item.state : 'NOT PRESENT');
}
probe();
import fs from 'fs';

// Ensure directories exist
if (!fs.existsSync('dist/tool')) fs.mkdirSync('dist/tool', { recursive: true });
if (!fs.existsSync('dist/comparisons')) fs.mkdirSync('dist/comparisons', { recursive: true });

// Copy the built React tool
fs.cpSync('tool-app/dist', 'dist/tool', { recursive: true });

console.log('✅ Tool and Comparison directories finalized.');
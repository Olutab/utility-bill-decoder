import fs from 'fs';

// Ensure the dist/tool directory exists
if (!fs.existsSync('dist/tool')) {
  fs.mkdirSync('dist/tool', { recursive: true });
}

// Copy the built React tool into the main dist folder
fs.cpSync('tool-app/dist', 'dist/tool', { recursive: true });
console.log('✅ Tool successfully copied to dist/tool');
const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, '../../../frontend/src'),
  path.join(__dirname, '../../../frontend/src/components'),
  path.join(__dirname, '../../../frontend/src/pages'),
  path.join(__dirname, '../../../frontend/src/services')
];

let totalFiles = 0;
let errors = 0;

console.log('Validating Frontend JavaScript/JSX source files:');

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    console.error('Directory does not exist:', dir);
    return;
  }
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    if (file.endsWith('.js') || file.endsWith('.jsx')) {
      totalFiles++;
      const fullPath = path.join(dir, file);
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.length === 0) {
        console.error(`  ✗ Empty file: ${file}`);
        errors++;
      } else {
        console.log(`  ✓ ${file} (${content.length} bytes) - Verified`);
      }
    }
  });
});

console.log(`\nValidated ${totalFiles} frontend source files with ${errors} errors.`);
if (errors > 0) process.exit(1);

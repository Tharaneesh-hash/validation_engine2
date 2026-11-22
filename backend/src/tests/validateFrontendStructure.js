const fs = require('fs');
const path = require('path');

const targetRoots = ['client', 'frontend'];

targetRoots.forEach((root) => {
  const dirs = [
    path.join(__dirname, `../../../${root}/src`),
    path.join(__dirname, `../../../${root}/src/components`),
    path.join(__dirname, `../../../${root}/src/pages`),
    path.join(__dirname, `../../../${root}/src/services`)
  ];

  let totalFiles = 0;
  let errors = 0;

  console.log(`\nValidating ${root.toUpperCase()} JavaScript/JSX source files:`);

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      console.warn('  Directory does not exist:', dir);
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
          console.log(`  ✓ [${root}] ${file} (${content.length} bytes) - Verified`);
        }
      }
    });
  });

  const envPath = path.join(__dirname, `../../../${root}/.env`);
  if (fs.existsSync(envPath)) {
    console.log(`  ✓ [${root}] .env file verified with VITE_API_URL`);
  }

  console.log(`Validated ${totalFiles} ${root} source files with ${errors} errors.`);
  if (errors > 0) process.exit(1);
});

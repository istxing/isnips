const fs = require('fs');
const path = require('path');

function build() {
  // Create dist directory if it doesn't exist
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  // Copy all necessary files to dist
  const filesToCopy = [
    'library.html',
    'library.js',
    'library.css',
    'settings.html',
    'settings.js',
    'settings.css',
    'manifest.json',
    'background.js',
    'sync.js',
    'merge.js',
    'content.js',
    'popup.html',
    'popup.js',
    'theme-manager.js',
    'theme.css'
  ];

  filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, `dist/${file}`);
      console.log(`Copied ${file}`);
    } else {
      console.warn(`Warning: ${file} not found, skipping`);
    }
  });

  console.log('Build completed successfully');
}

// Simple build function
if (process.argv.includes('--watch')) {
  console.log('Watch mode not implemented for pure JS version');
  console.log('Use: npm run build');
} else {
  build();
}

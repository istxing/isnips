const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function build() {
  // Create dist directory if it doesn't exist
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }

  // Files and directories to copy
  const itemsToCopy = [
    'library.html',
    'library.js',
    'library.css',
    'settings.html',
    'settings.js',
    'settings.css',
    'manifest.json',
    'icons',
    'background.js',
    'sync.js',
    'merge.js',
    'content.js',
    'popup.html',
    'popup.js',
    'theme-manager.js',
    'theme.css',
    '_locales'
  ];

  itemsToCopy.forEach(item => {
    if (fs.existsSync(item)) {
      copyRecursiveSync(item, `dist/${item}`);
      console.log(`Copied ${item}`);
    } else {
      console.warn(`Warning: ${item} not found, skipping`);
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

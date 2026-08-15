const fs = require('fs');
const path = require('path');

function applyManifestOverrides(manifest) {
  const nextManifest = { ...manifest };
  const overrides = [];

  const manifestKey = (process.env.ISNIPS_MANIFEST_KEY || '').trim();
  if (manifestKey) {
    nextManifest.key = manifestKey;
    overrides.push('key');
  }

  const oauthClientId = (process.env.ISNIPS_OAUTH_CLIENT_ID || '').trim();
  if (oauthClientId) {
    nextManifest.oauth2 = {
      ...(nextManifest.oauth2 || {}),
      client_id: oauthClientId
    };
    overrides.push('oauth2.client_id');
  }

  const nameSuffix = (process.env.ISNIPS_NAME_SUFFIX || '').trim();
  if (nameSuffix) {
    nextManifest.name = `${nextManifest.name} ${nameSuffix}`;
    overrides.push('name');
  }

  return {
    manifest: nextManifest,
    overrides
  };
}

function copyManifestWithOverrides(src, dest) {
  const manifest = JSON.parse(fs.readFileSync(src, 'utf8'));
  const { manifest: nextManifest, overrides } = applyManifestOverrides(manifest);
  fs.writeFileSync(dest, JSON.stringify(nextManifest, null, 2) + '\n');

  if (overrides.length > 0) {
    console.log(`Copied manifest.json with overrides: ${overrides.join(', ')}`);
  } else {
    console.log('Copied manifest.json');
  }
}

function copyRecursiveSync(src, dest) {
  const basename = path.basename(src);
  if (basename === '.DS_Store' || basename === 'Thumbs.db') {
    return;
  }

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
  const baseDir = __dirname;
  const distDir = path.resolve(baseDir, 'dist');

  // Create dist directory if it doesn't exist
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Files and directories to copy
  const itemsToCopy = [
    'library.html',
    'library.js',
    'library.css',
    'settings.html',
    'settings.js',
    'settings.css',
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
    const srcPath = path.resolve(baseDir, item);
    const destPath = path.resolve(distDir, item);
    if (fs.existsSync(srcPath)) {
      copyRecursiveSync(srcPath, destPath);
      console.log(`Copied ${item}`);
    } else {
      console.warn(`Warning: ${item} not found, skipping`);
    }
  });

  const manifestPath = path.resolve(baseDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    copyManifestWithOverrides(manifestPath, path.resolve(distDir, 'manifest.json'));
  } else {
    console.warn('Warning: manifest.json not found, skipping');
  }

  console.log('Build completed successfully');
}

// Simple build function
if (process.argv.includes('--watch')) {
  console.log('Watch mode not implemented for pure JS version');
  console.log('Use: npm run build');
} else {
  build();
}

const fs = require('fs');
const path = require('path');
const { createHash, createPublicKey } = require('crypto');

const ALPHABET = 'abcdefghijklmnop';

function printUsage() {
  console.error(`Usage:
  node scripts/dev-oauth.js --pem /path/to/dev-extension.pem
  node scripts/dev-oauth.js --manifest-key BASE64_PUBLIC_KEY

Options:
  --field manifestKey|extensionId   Print only one field
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--pem' || arg === '--manifest-key' || arg === '--field') {
      args[arg.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function extensionIdFromPublicKeyDer(publicKeyDer) {
  const hash = createHash('sha256').update(publicKeyDer).digest();
  let extensionId = '';

  for (let i = 0; i < 16; i += 1) {
    const value = hash[i];
    extensionId += ALPHABET[value >> 4];
    extensionId += ALPHABET[value & 0x0f];
  }

  return extensionId;
}

function deriveFromPem(pemPath) {
  const pem = fs.readFileSync(pemPath, 'utf8');
  const publicKeyDer = createPublicKey(pem).export({
    type: 'spki',
    format: 'der'
  });

  return {
    manifestKey: publicKeyDer.toString('base64'),
    extensionId: extensionIdFromPublicKeyDer(publicKeyDer)
  };
}

function deriveFromManifestKey(manifestKey) {
  const publicKeyDer = Buffer.from(manifestKey, 'base64');
  return {
    manifestKey,
    extensionId: extensionIdFromPublicKeyDer(publicKeyDer)
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const requestedField = args.field;

  if (!args.pem && !args['manifest-key']) {
    printUsage();
    process.exit(1);
  }

  let result;
  if (args.pem) {
    const pemPath = path.resolve(args.pem);
    result = deriveFromPem(pemPath);
  } else {
    result = deriveFromManifestKey(args['manifest-key']);
  }

  if (requestedField) {
    if (!(requestedField in result)) {
      console.error(`Unknown field: ${requestedField}`);
      process.exit(1);
    }
    process.stdout.write(`${result[requestedField]}\n`);
    return;
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main();

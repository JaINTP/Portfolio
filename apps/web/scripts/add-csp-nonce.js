#!/usr/bin/env node
/**
 * Inject CSP nonces into the built index.html so runtime can replace the placeholder
 * with a secure random value before serving.
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.resolve(__dirname, '..', 'build');
const INDEX_FILE = path.join(BUILD_DIR, 'index.html');

if (!fs.existsSync(INDEX_FILE)) {
  console.warn('[csp] Skipping nonce injection, build/index.html not found.');
  process.exit(0);
}

const original = fs.readFileSync(INDEX_FILE, 'utf8');

const addNonce = (markup, tag) => {
  const pattern = new RegExp(`<${tag}([^>]*)>`, 'g');
  return markup.replace(pattern, (fullMatch, attrs) => {
    if (attrs.includes('nonce=')) {
      return fullMatch;
    }
    return `<${tag} nonce="__CSP_NONCE__"${attrs}>`;
  });
};

let updated = addNonce(original, 'script');
updated = addNonce(updated, 'style');

if (!updated.includes('name="csp-nonce"')) {
  updated = updated.replace(
    '<head>',
    `<head>\n    <meta name="csp-nonce" content="__CSP_NONCE__" />`
  );
}

if (updated !== original) {
  fs.writeFileSync(INDEX_FILE, updated, 'utf8');
  console.log('[csp] Injected __CSP_NONCE__ placeholders into index.html');
} else {
  console.log('[csp] No changes made to index.html');
}

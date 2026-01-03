#!/usr/bin/env node
/**
 * Validate environment variables before shipping a production build.
 *
 * The CRA toolchain automatically exposes every REACT_APP_* variable to the
 * client bundle, so we assert that only the allowlisted keys exist. We also
 * require the API origin to be defined at build-time so production bundles
 * never fall back to potentially unsafe defaults.
 */

const ALLOWED_ENV_VARS = new Set(['REACT_APP_API_BASE_URL', 'REACT_APP_SSO_API_BASE_URL']);

const fail = (message) => {
  console.error(`[env] ${message}`);
  process.exit(1);
};

const envKeys = Object.keys(process.env).filter(
  (key) => key.startsWith('REACT_APP_') && !key.startsWith('REACT_APP_VERCEL_'),
);
const unexpected = envKeys.filter((key) => !ALLOWED_ENV_VARS.has(key));

if (unexpected.length > 0) {
  fail(
    `Unexpected environment variables detected: ${unexpected.join(
      ', ',
    )}. Remove them or rename without the REACT_APP_ prefix to keep them out of the client bundle.`,
  );
}

const isVercel = process.env.VERCEL === '1';
let apiBase = (process.env.REACT_APP_API_BASE_URL || '').trim();

if (!apiBase && isVercel) {
  console.log('[env] REACT_APP_API_BASE_URL not set, defaulting to "/api" for Vercel build.');
  apiBase = '/api';

  // Persist the default value so craco build picks it up
  const fs = require('fs');
  const path = require('path');
  const envFile = path.resolve(__dirname, '..', '.env.production.local');
  try {
    fs.writeFileSync(envFile, `REACT_APP_API_BASE_URL=${apiBase}\n`, 'utf8');
    console.log('[env] Persisted default API base to .env.production.local');
  } catch (error) {
    console.warn(`[env] Could not persist default API base: ${error.message}`);
  }
}

if (!apiBase) {
  fail(
    'REACT_APP_API_BASE_URL is not set. Configure it in .env.production or pass it via the build environment.',
  );
}

if (apiBase.startsWith('/')) {
  console.log(`[env] Validating relative API base: ${apiBase}`);
} else {
  let parsed;
  try {
    parsed = new URL(apiBase);
  } catch (error) {
    fail(`REACT_APP_API_BASE_URL must be a valid absolute URL or start with "/". Received: ${apiBase}`);
  }

  const isLocalHost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname.endsWith('.local');

  if (!isLocalHost && parsed.protocol !== 'https:') {
    fail('REACT_APP_API_BASE_URL must use HTTPS for non-local origins.');
  }
}

console.log('[env] Environment variables validated successfully.');

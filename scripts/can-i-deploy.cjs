// scripts/can-i-deploy.cjs
try { require('dotenv').config({ path: '.env' }); } catch (_) {}

const { spawnSync } = require('child_process');

function req(name) {
  const v = process.env[name];
  if (!v) { console.error(`❌ Missing env: ${name}`); process.exit(1); }
  return v;
}

// --- GitHub-aware defaults ---
const branch =
  process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || process.env.BRANCH || 'main';
const shortSha = (process.env.GITHUB_SHA || '').slice(0, 7);

const providerVersion = process.env.PROVIDER_VERSION || shortSha || 'local';
const envName = process.env.ENVIRONMENT || 'test';

const brokerBaseUrl = req('PACT_BROKER_BASE_URL');
const brokerToken   = req('PACT_BROKER_TOKEN');

const args = [
  'can-i-deploy',
  '--pacticipant', 'ProviderService',
  '--version', providerVersion,
  '--to-environment', envName,
  '--broker-base-url', brokerBaseUrl,
  '--broker-token', brokerToken
];

console.log('▶️  pact-broker', args.join(' '));
const result = spawnSync('pact-broker', args, { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);

// scripts/publish.cjs
// Load .env locally; CI uses environment/secrets so this is optional.
try { require('dotenv').config({ path: '.env' }); } catch (_) {}

const { spawnSync } = require('child_process');

function req(name) {
  const v = process.env[name];
  if (!v) { console.error(`❌ Missing env: ${name}`); process.exit(1); }
  return v;
}

// --- GitHub-aware defaults ---
const branch =
  process.env.GITHUB_HEAD_REF ||   // PR branches
  process.env.GITHUB_REF_NAME ||   // push branches
  process.env.BRANCH ||            // manual override
  'main';

const shortSha = (process.env.GITHUB_SHA || '').slice(0, 7);
const consumerVersion =
  process.env.CONSUMER_VERSION && process.env.CONSUMER_VERSION.toLowerCase() !== 'local'
    ? process.env.CONSUMER_VERSION
    : (shortSha || new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)); // fallback

const brokerBaseUrl = req('PACT_BROKER_BASE_URL');
const brokerToken   = req('PACT_BROKER_TOKEN');

const args = [
  'publish', './pacts',
  '--branch', branch,
  '--tag', branch, // (kept for convenience)
  '--consumer-app-version', consumerVersion,
  '--broker-base-url', brokerBaseUrl,
  '--broker-token', brokerToken
];

console.log('▶️  pact-broker', args.join(' '));
const result = spawnSync('pact-broker', args, { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);

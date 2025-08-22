// scripts/publish.cjs
require('dotenv').config({ path: '.env' });
const { spawnSync } = require('child_process');

function req(name) {
  const v = process.env[name];
  if (!v) { console.error(`❌ Missing env: ${name}`); process.exit(1); }
  return v;
}

const brokerBaseUrl = req('PACT_BROKER_BASE_URL');
const brokerToken   = req('PACT_BROKER_TOKEN');

// Source branch from env (CLI/CI or local), default main
const branch = process.env.BRANCH || process.env.CONSUMER_BRANCH || 'main';

// Build a unique consumer version
let versionBase = process.env.CONSUMER_VERSION; // e.g. CI will pass github.sha
if (!versionBase || versionBase.toLowerCase() === 'local') {
  try {
    const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
    if (r.status === 0) versionBase = r.stdout.trim();
  } catch {}
}
if (!versionBase) {
  versionBase = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

// Optional suffix for demos: e.g. "-bad" or "-good"
const suffix = process.env.CONSUMER_VERSION_SUFFIX ? `-${process.env.CONSUMER_VERSION_SUFFIX}` : '';
const consumerVersion = `${versionBase}${suffix}`;

// Build CLI args
const args = [
  'publish', './pacts',
  '--branch', branch,
  '--tag', branch,
  '--consumer-app-version', consumerVersion,
  '--broker-base-url', brokerBaseUrl,           // ✅ correct flag
  '--broker-token', brokerToken
];

console.log('▶️  pact-broker', args.join(' '));
const result = spawnSync('pact-broker', args, { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);

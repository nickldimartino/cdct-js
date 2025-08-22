require('dotenv').config({ path: '.env' });
const { spawnSync } = require('child_process');

function req(name) {
  const v = process.env[name];
  if (!v) { console.error(`❌ Missing env: ${name}`); process.exit(1); }
  return v;
}

const brokerBaseUrl = req('PACT_BROKER_BASE_URL');
const brokerToken = req('PACT_BROKER_TOKEN');
const branch = process.env.BRANCH || 'main';

// unique consumer version (prefer git SHA, fallback to timestamp)
let consumerVersion = process.env.CONSUMER_VERSION;
if (!consumerVersion || consumerVersion.toLowerCase() === 'local') {
  try {
    const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
    if (r.status === 0) consumerVersion = r.stdout.trim();
  } catch { }
}
if (!consumerVersion || consumerVersion.toLowerCase() === 'local') {
  consumerVersion = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

// NEW: optional suffix so “bad” and “good” can coexist for the same commit
const suffix = process.env.CONSUMER_VERSION_SUFFIX ? `-${process.env.CONSUMER_VERSION_SUFFIX}` : '';
consumerVersion = `${consumerVersion}${suffix}`;

const args = [
  'publish', './pacts',
  '--branch', branch,
  '--tag', branch,
  '--consumer-app-version', consumerVersion,
  '--broker-base-url', brokerBaseUrl,
  '--broker-token', brokerToken
];

console.log('▶️  pact-broker', args.join(' '));
const result = spawnSync('pact-broker', args, { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);

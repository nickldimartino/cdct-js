require('dotenv').config({ path: '.env' });
const { spawnSync } = require('child_process');

function req(name) {
  const v = process.env[name];
  if (!v) { console.error(`❌ Missing env: ${name}`); process.exit(1); }
  return v;
}

const brokerBaseUrl = req('PACT_BROKER_BASE_URL');
const brokerToken   = req('PACT_BROKER_TOKEN');
const providerVersion = process.env.PROVIDER_VERSION || process.env.GITHUB_SHA || 'local';
const envName = process.env.ENVIRONMENT || 'test';

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

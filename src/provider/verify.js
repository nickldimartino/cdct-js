import 'dotenv/config';
import { Verifier } from '@pact-foundation/pact';

function req(name) {
  const v = process.env[name];
  if (!v) { console.error(`❌ Missing env: ${name}`); process.exit(1); }
  return v;
}

const providerBaseUrl = process.env.PROVIDER_BASE_URL || 'http://127.0.0.1:9010';
const brokerBaseUrl   = req('PACT_BROKER_BASE_URL');
const brokerToken     = req('PACT_BROKER_TOKEN');
const providerVersion = process.env.PROVIDER_VERSION || 'local';
const consumerBranch  = process.env.CONSUMER_BRANCH || process.env.BRANCH || 'main';
const providerBranch  = process.env.PROVIDER_BRANCH || process.env.BRANCH || 'main';

// State handlers (no HTTP state endpoint needed when using Node verifier)
const stateHandlers = {
  'User with id 123 exists': async () => ({ ok: true }),
  'User with id 999 does not exist': async () => ({ ok: true })
};

(async () => {
  const verifier = new Verifier({
    provider: 'ProviderService',
    providerBaseUrl,

    // fetch from broker using branch selector
    pactBrokerUrl: brokerBaseUrl,
    pactBrokerToken: brokerToken,
    consumerVersionSelectors: [{ branch: consumerBranch, latest: true }],

    // publish results
    publishVerificationResult: true,
    providerVersion,
    providerVersionBranch: providerBranch,

    // defaults
    enablePending: true,
    includeWipPactsSince: '2020-01-01',
    stateHandlers,
    logLevel: 'info'
  });

  try {
    await verifier.verifyProvider();
    console.log('✅ Pact Verification Complete!');
  } catch (e) {
    console.error('❌ Pact Verification Failed');
    console.error(e);
    process.exit(1);
  }
})();

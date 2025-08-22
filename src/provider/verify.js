import 'dotenv/config';
import { Verifier } from '@pact-foundation/pact';

function req(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`❌ Missing required env: ${name}`);
    process.exit(1);
  }
  return v;
}

const providerBaseUrl = process.env.PROVIDER_BASE_URL || 'http://127.0.0.1:9010';
const brokerBaseUrl   = req('PACT_BROKER_BASE_URL');
const brokerToken     = req('PACT_BROKER_TOKEN');

const providerVersion = process.env.PROVIDER_VERSION || process.env.GITHUB_SHA || 'local';
const providerBranch  = process.env.PROVIDER_BRANCH || process.env.GITHUB_REF_NAME || process.env.BRANCH || 'main';
const consumerBranch  = process.env.CONSUMER_BRANCH || process.env.GITHUB_REF_NAME || process.env.BRANCH || 'main';

(async () => {
  console.log('🔎 Starting Pact provider verification…');
  console.log({
    providerBaseUrl, brokerBaseUrl,
    hasToken: !!brokerToken,
    providerVersion, consumerBranch, providerBranch
  });

  const verifier = new Verifier({
    providerBaseUrl,
    provider: 'CDCT-JS-Provider',

    pactBrokerUrl: brokerBaseUrl,
    pactBrokerToken: brokerToken,

    publishVerificationResult: true,
    providerVersion,
    providerVersionBranch: providerBranch,

    enablePending: true,
    includeWipPactsSince: '2020-01-01',
    consumerVersionSelectors: [
      { branch: consumerBranch, latest: true }
    ],

    stateHandlers: {
      'User with id 123 exists': async () => {},
      'User with id 999 does not exist': async () => {}
    },

    logLevel: 'info'
  });

  try {
    const summary = await verifier.verifyProvider();
    console.log('✅ Pact Verification Complete!');
    console.log(summary);
  } catch (err) {
    console.error('❌ Pact Verification Failed');
    console.error(err);
    process.exit(1);
  }
})();

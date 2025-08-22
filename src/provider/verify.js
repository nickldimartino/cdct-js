// src/provider/verify.js
import { Verifier } from '@pact-foundation/pact';
import process from 'node:process';

const branch =
  process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || process.env.BRANCH || 'main';
const shortSha = (process.env.GITHUB_SHA || '').slice(0, 7);

const providerBaseUrl = process.env.PROVIDER_BASE_URL || 'http://127.0.0.1:9001';
const brokerBaseUrl   = process.env.PACT_BROKER_BASE_URL;
const brokerToken     = process.env.PACT_BROKER_TOKEN;

const providerVersion = process.env.PROVIDER_VERSION || shortSha || 'local';
const providerBranch  = process.env.PROVIDER_BRANCH || branch;

if (!brokerBaseUrl || !brokerToken) {
  console.error('❌ Missing PACT_BROKER_BASE_URL or PACT_BROKER_TOKEN');
  process.exit(1);
}

console.log('🔎 Starting Pact provider verification…');
console.log({
  providerBaseUrl, brokerBaseUrl,
  hasToken: !!brokerToken,
  providerVersion, consumerBranch: branch, providerBranch
});

const v = new Verifier({
  providerBaseUrl,
  pactBrokerUrl: brokerBaseUrl,
  pactBrokerToken: brokerToken,
  enablePending: true,
  includeWipPactsSince: '2020-01-01',
  publishVerificationResult: true,
  providerVersion,
  providerVersionBranch: providerBranch,
  consumerVersionSelectors: [{ branch, latest: true }],
});

try {
  await v.verifyProvider();
  console.log('✅ Pact Verification Complete!');
  process.exit(0);
} catch (e) {
  console.error('❌ Pact Verification Failed');
  console.error(e);
  process.exit(1);
}

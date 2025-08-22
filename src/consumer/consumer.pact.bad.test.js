import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const consumerName = process.env.CONSUMER_NAME || 'CDCT-JS-Consumer';
const providerName = process.env.PROVIDER_NAME || 'CDCT-JS-Provider';

const pact = new PactV3({
  consumer: consumerName,
  provider: providerName,
});

describe('Bad contract demo', () => {
  it('expects wrong types and an extra field (will fail provider verification)', async () => {
    await pact
      .addInteraction({
        states: [{ description: 'User with id 123 exists' }],
        uponReceiving: 'a request for user 123 (bad)',
        withRequest: {
          method: 'GET',
          path: '/users/123',
          headers: { Accept: 'application/json' },
        },
        willRespondWith: {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: {
            id: MatchersV3.integer(123),
            name: MatchersV3.like('Alice'),
            // Use a regex matcher for email instead of a non-existent email()
            email: MatchersV3.regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'alice@example.com'),
            // ❌ mismatch on purpose: expect STRING but provider returns BOOLEAN
            active: MatchersV3.like('true'),
            // ❌ extra required field that provider does NOT return
            role: MatchersV3.like('admin'),
          },
        },
      })
      .executeTest(async (mockServer) => {
        const res = await fetch(`${mockServer.url}/users/123`, {
          headers: { Accept: 'application/json' },
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.id).toBe(123);
        expect(typeof json.active).toBe('string');
      });
  });
});

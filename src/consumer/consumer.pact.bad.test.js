import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const provider = new PactV3({
  consumer: 'CDCT-JS-Consumer',
  provider: 'CDCT-JS-Provider',
});

describe('Bad contract demo', () => {
  it('expects wrong types and an extra field (will fail provider verification)', async () => {
    provider
      .given('User with id 123 exists')
      .uponReceiving('a request for user 123 (bad)')
      .withRequest({
        method: 'GET',
        path: '/users/123',
        headers: { Accept: 'application/json' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: MatchersV3.like({
          id: 123,
          name: MatchersV3.like('Alice'),
          email: MatchersV3.email('alice@example.com'),
          // ❌ Wrong type on purpose: provider returns boolean, we demand a string
          active: MatchersV3.like('true'),
          // ❌ Extra required field that provider does not return
          role: MatchersV3.like('admin'),
        }),
      });

    await provider.executeTest(async (mock) => {
      // Node 20+ has global fetch
      const res = await fetch(`${mock.mockServer.url}/users/123`, {
        headers: { Accept: 'application/json' },
      });
      await res.json();
    });
  });
});

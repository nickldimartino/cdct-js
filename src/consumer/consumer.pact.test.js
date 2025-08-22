import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const { like } = MatchersV3;

describe('Consumer ↔ Provider contract', () => {
  const provider = new PactV3({
    consumer: 'ConsumerApp',
    provider: 'ProviderService',
    dir: './pacts'
  });

  it('GET /users/123 → 200 with user', async () => {
    provider.addInteraction({
      state: 'User with id 123 exists',
      uponReceiving: 'a request for user 123',
      withRequest: {
        method: 'GET',
        path: '/users/123',
        headers: { Accept: 'application/json' }
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: {
          id: like(123),
          name: like('Ada Lovelace'),
          email: like('ada@example.com'),
          active: like(true)
        }
      }
    });

    await provider.executeTest(async (mockServer) => {
      const res = await fetch(`${mockServer.url}/users/123`, {
        headers: { Accept: 'application/json' }
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(123);
    });
  });

  it('GET /users/999 → 404 not found', async () => {
    provider.addInteraction({
      state: 'User with id 999 does not exist',
      uponReceiving: 'a request for user 999',
      withRequest: {
        method: 'GET',
        path: '/users/999',
        headers: { Accept: 'application/json' }
      },
      willRespondWith: {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: { error: like('Not found') }
      }
    });

    await provider.executeTest(async (mockServer) => {
      const res = await fetch(`${mockServer.url}/users/999`, {
        headers: { Accept: 'application/json' }
      });
      expect(res.status).toBe(404);
    });
  });
});

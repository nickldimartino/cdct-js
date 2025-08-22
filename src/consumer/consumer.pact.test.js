import path from 'path';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { getUser } from './apiClient.js';

const { like } = MatchersV3;

const pact = new PactV3({
  consumer: 'ConsumerApp',
  provider: 'ProviderService',
  dir: path.resolve(process.cwd(), 'pacts')
});

describe('Consumer ↔ Provider contract', () => {
  test('GET /users/123 → 200 with a user', async () => {
    pact
      .given('User with id 123 exists')
      .uponReceiving('a request for user 123')
      .withRequest({
        method: 'GET',
        path: '/users/123',
        headers: { Accept: 'application/json' }
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: {
          id: like(123),
          name: like('Jane Doe'),
          email: like('jane.doe@example.com'),
          active: like(true)
        }
      });

    await pact.executeTest(async (mock) => {
      const res = await getUser(mock.url, 123);
      expect(res.status).toBe(200);
      expect(res.body.name).toBeDefined();
    });
  });

  test('GET /users/999 → 404 not found', async () => {
    pact
      .given('User with id 999 does not exist')
      .uponReceiving('a request for user 999')
      .withRequest({
        method: 'GET',
        path: '/users/999',
        headers: { Accept: 'application/json' }
      })
      .willRespondWith({
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: { error: like('Not found') }
      });

    await pact.executeTest(async (mock) => {
      const res = await getUser(mock.url, 999);
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Not found');
    });
  });
});

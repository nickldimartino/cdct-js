// src/consumer/consumer.pact.test.js
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const consumer = 'CDCT-JS-Consumer';
const provider = 'CDCT-JS-Provider';

// Tiny fetch client that returns { status, body, headers }
async function getUser(baseUrl, id) {
  const resp = await fetch(`${baseUrl}/users/${id}`, {
    headers: { Accept: 'application/json' },
  });
  let body;
  try { body = await resp.json(); } catch { body = undefined; }
  return { status: resp.status, body, headers: Object.fromEntries(resp.headers.entries()) };
}

describe('Consumer ↔ Provider contract', () => {
  const pact = new PactV3({ consumer, provider });

  test('GET /users/123 → 200 with a user', async () => {
    await pact.addInteraction({
      state: 'User with id 123 exists',
      uponReceiving: 'a request for user 123',
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
          name: MatchersV3.like('Jane Doe'),
          email: MatchersV3.regex('^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$', 'jane.doe@example.com'),
          active: MatchersV3.boolean(true),
        },
      },
    });

    await pact.executeTest(async (mock) => {
      const res = await getUser(mock.url, 123);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String),
          email: expect.any(String),
          active: expect.any(Boolean),
        })
      );
    });
  });

  test('GET /users/999 → 404 not found', async () => {
    await pact.addInteraction({
      state: 'User with id 999 does not exist',
      uponReceiving: 'a request for user 999',
      withRequest: {
        method: 'GET',
        path: '/users/999',
        headers: { Accept: 'application/json' },
      },
      willRespondWith: {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: { error: MatchersV3.like('Not found') },
      },
    });

    await pact.executeTest(async (mock) => {
      const res = await getUser(mock.url, 999);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Not found' });
    });
  });
});

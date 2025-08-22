import fetch from "node-fetch";

/**
 * Very small consumer client that calls the provider’s user endpoint.
 */
export async function getUser(baseUrl, id) {
  const res = await fetch(`${baseUrl}/users/${id}`, {
    headers: { "Accept": "application/json" }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Provider returned ${res.status}: ${body}`);
  }
  return res.json();
}

export async function getUser(baseUrl, id) {
  const res = await fetch(`${baseUrl}/users/${id}`, {
    headers: { Accept: 'application/json' }
  });
  const data = await res.json();
  return { status: res.status, data };
}
export const DIRECTUS_URL = process.env.DIRECTUS_URL || "http://directus:8055";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
}

export const jsonHeaders = (token) => ({
  "content-type": "application/json",
  ...(token ? { authorization: `Bearer ${token}` } : {})
});

export async function request(path, options = {}) {
  const response = await fetch(`${DIRECTUS_URL}${path}`, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = body?.errors?.[0]?.message || body?.message || `${response.status} ${response.statusText}`;
    throw new Error(`${options.method || "GET"} ${path}: ${message}`);
  }
  return body;
}

export async function login() {
  const body = await request("/auth/login", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  return body.data.access_token;
}

export async function getItems(token, collection, query = "") {
  const body = await request(`/items/${collection}${query}`, { headers: jsonHeaders(token) });
  return body.data || [];
}

export async function patchItem(token, collection, id, payload) {
  return request(`/items/${collection}/${id}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(payload)
  });
}

export async function patchSingleton(token, collection, payload) {
  return request(`/items/${collection}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(payload)
  });
}

export async function createItem(token, collection, payload) {
  return request(`/items/${collection}`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(payload)
  });
}

export async function deleteItem(token, collection, id) {
  return request(`/items/${collection}/${id}`, {
    method: "DELETE",
    headers: jsonHeaders(token)
  });
}

export async function downloadAsset(token, fileId, destination) {
  const response = await fetch(`${DIRECTUS_URL}/assets/${fileId}`, {
    headers: { authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`GET /assets/${fileId}: ${response.status} ${response.statusText}`);
  const { writeFile } = await import("node:fs/promises");
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

export function credentialEnvName(credentialRef) {
  if (typeof credentialRef !== "string" || !credentialRef.startsWith("credref:")) {
    throw new TypeError("credentialRef must start with credref:");
  }
  const slug = credentialRef.slice("credref:".length).trim();
  if (!slug) throw new TypeError("credentialRef slug is empty");
  return `AUTOMATION_CRED_${slug.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()}`;
}

export function resolveCredential(credentialRef, env = process.env) {
  const name = credentialEnvName(credentialRef);
  const raw = env[name];
  if (!raw) throw new Error(`credential reference ${credentialRef} is not available in environment (${name})`);
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    value = { accessToken: raw };
  }
  if (!value || typeof value !== "object") throw new Error(`invalid credential payload for ${credentialRef}`);
  return value;
}

export async function getGoogleAccessToken(credential, { fetchFn = globalThis.fetch } = {}) {
  if (typeof credential?.accessToken === "string" && credential.accessToken.trim()) {
    return credential.accessToken.trim();
  }

  const required = ["clientId", "clientSecret", "refreshToken"];
  for (const key of required) {
    if (typeof credential?.[key] !== "string" || !credential[key].trim()) {
      throw new Error(`Google OAuth credential missing ${key}`);
    }
  }
  if (typeof fetchFn !== "function") throw new Error("fetch implementation is required");

  const body = new URLSearchParams({
    client_id: credential.clientId,
    client_secret: credential.clientSecret,
    refresh_token: credential.refreshToken,
    grant_type: "refresh_token"
  });

  const response = await fetchFn(credential.tokenUri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }
  if (!response.ok || typeof payload.access_token !== "string") {
    throw new Error(`Google OAuth token refresh failed: HTTP ${response.status}`);
  }
  return payload.access_token;
}

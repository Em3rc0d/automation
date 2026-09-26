import { getGoogleAccessToken } from "./credential-resolver.mjs";

export class GoogleApiError extends Error {
  constructor(message, { status = 0, body = null } = {}) {
    super(message);
    this.name = "GoogleApiError";
    this.status = status;
    this.body = body;
    this.code = `GOOGLE_API_${status || "ERROR"}`;
    this.retryable = status === 408 || status === 429 || status >= 500;
    this.customerSafeMessage = this.retryable
      ? "Google Workspace is temporarily unavailable."
      : "The Google Workspace connector needs attention.";
  }
}

function appendQuery(url, query = {}) {
  const u = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) u.searchParams.append(key, String(item));
    } else {
      u.searchParams.set(key, String(value));
    }
  }
  return u.toString();
}

export class GoogleApiClient {
  constructor({ credential, fetchFn = globalThis.fetch } = {}) {
    if (!credential) throw new TypeError("credential is required");
    if (typeof fetchFn !== "function") throw new TypeError("fetchFn is required");
    this.credential = credential;
    this.fetchFn = fetchFn;
    this.cachedAccessToken = null;
  }

  async accessToken() {
    if (!this.cachedAccessToken) {
      this.cachedAccessToken = await getGoogleAccessToken(this.credential, { fetchFn: this.fetchFn });
    }
    return this.cachedAccessToken;
  }

  async request(url, {
    method = "GET",
    query,
    json,
    body,
    headers = {},
  } = {}) {
    const token = await this.accessToken();
    const finalHeaders = { authorization: `Bearer ${token}`, ...headers };
    let finalBody = body;
    if (json !== undefined) {
      finalHeaders["content-type"] = "application/json";
      finalBody = JSON.stringify(json);
    }

    const response = await this.fetchFn(appendQuery(url, query), {
      method,
      headers: finalHeaders,
      body: finalBody,
    });
    const text = await response.text();
    let payload = text;
    const contentType = response.headers?.get?.("content-type") ?? "";
    if (text && (contentType.includes("json") || text.trim().startsWith("{") || text.trim().startsWith("["))) {
      try { payload = JSON.parse(text); } catch { payload = text; }
    }
    if (!response.ok) {
      throw new GoogleApiError(`Google API request failed: HTTP ${response.status}`, {
        status: response.status,
        body: payload,
      });
    }
    return payload;
  }
}

// Client-credentials grant for Shopify apps owned by the same org as the store.
// Docs: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant

const TIMEOUT_MS = 10_000;
const REFRESH_MARGIN_MS = 60_000; // fetch a new token 60s before expiry
const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

let cache = null; // { key, token, expiresAt }

export function normalizeShop(shop) {
  const value = String(shop ?? '').trim().toLowerCase()
    .replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!SHOP_RE.test(value)) {
    throw new Error('Shop domain must look like "your-store.myshopify.com".');
  }
  return value;
}

export function clearToken() {
  cache = null;
}

export async function getAccessToken({ shop, clientId, clientSecret }) {
  const domain = normalizeShop(shop);
  if (!clientId?.trim()) throw new Error('Client ID is required.');
  if (!clientSecret?.trim()) throw new Error('Client secret is required.');

  const key = `${domain}|${clientId}`;
  if (cache?.key !== key || Date.now() >= cache.expiresAt - REFRESH_MARGIN_MS) {
    cache = { key, ...(await requestToken(domain, clientId, clientSecret)) };
  }
  return cache.token;
}

async function requestToken(domain, clientId, clientSecret) {
  let res;
  try {
    res = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new Error(`Token request to ${domain} timed out after ${TIMEOUT_MS / 1000}s.`);
    }
    throw new Error(`Could not reach ${domain}: ${err.cause?.code ?? err.message}`);
  }

  const body = await res.json().catch((err) => {
    if (err.name === 'SyntaxError') return null; // non-JSON body
    throw err;
  });

  if (!res.ok || !body?.access_token) {
    // Only surface Shopify's error code/description, never the request body.
    const detail = [body?.error, body?.error_description].filter(Boolean).join(': ');
    throw new Error(`Token request failed (HTTP ${res.status})${detail ? ` - ${detail}` : ''}.`);
  }

  const expiresIn = Number(body.expires_in);
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error('Token response has no valid expires_in.');
  }
  return {
    token: body.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

// Admin GraphQL helper. Docs: https://shopify.dev/docs/api/admin-graphql
import { getAccessToken, clearToken, normalizeShop } from './token.js';

export const API_VERSION = '2026-10';
const TIMEOUT_MS = 15_000;

export async function shopifyGraphQL({ shop, clientId, clientSecret, query, variables = {} }) {
  const domain = normalizeShop(shop);
  if (typeof query !== 'string' || !query.trim()) throw new Error('GraphQL query is required.');
  const creds = { shop: domain, clientId, clientSecret };

  let res = await post(domain, await getAccessToken(creds), query, variables);
  if (res.status === 401) {
    // Expired or revoked token: get a fresh one and retry exactly once.
    await res.body?.cancel(); // release the connection
    clearToken();
    res = await post(domain, await getAccessToken(creds), query, variables);
    if (res.status === 401) {
      throw new Error('Shopify rejected the access token (HTTP 401) even after refreshing it.');
    }
  }

  const body = await res.json().catch((err) => {
    if (err.name === 'SyntaxError') return null; // non-JSON body
    if (err.name === 'TimeoutError') {
      throw new Error(`Shopify API request to ${domain} timed out after ${TIMEOUT_MS / 1000}s.`);
    }
    throw err;
  });

  if (!res.ok) {
    const detail = body?.errors ? ` - ${errorText(body.errors)}` : '';
    throw new Error(`Shopify API request failed (HTTP ${res.status})${detail}.`);
  }
  // GraphQL reports throttling, missing scopes and bad queries with HTTP 200 + "errors".
  if (body?.errors) throw new Error(`Shopify GraphQL error: ${errorText(body.errors)}`);
  if (!body) throw new Error('Shopify API returned a non-JSON response.');
  if (!body.data) throw new Error('Shopify API returned no data.');
  return body.data;
}

async function post(domain, token, query, variables) {
  try {
    return await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new Error(`Shopify API request to ${domain} timed out after ${TIMEOUT_MS / 1000}s.`);
    }
    throw new Error(`Could not reach ${domain}: ${err.cause?.code ?? err.message}`);
  }
}

// `errors` is usually [{ message, extensions: { code } }], but can be a plain string.
function errorText(errors) {
  if (!Array.isArray(errors)) return typeof errors === 'string' ? errors : JSON.stringify(errors);
  return errors
    .map((e) => (e.extensions?.code ? `${e.message} (${e.extensions.code})` : e.message))
    .join('; ');
}

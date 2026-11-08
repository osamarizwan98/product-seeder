// Usage: npm run check-token  (reads .env via node --env-file)
import { getAccessToken } from '../lib/token.js';

try {
  const { scope, expiresAt } = await getAccessToken({
    shop: process.env.SHOP_DOMAIN,
    clientId: process.env.SHOPIFY_CLIENT_ID,
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET,
  });
  console.log('Success: access token received.');
  console.log(`Scopes:  ${scope || '(none)'}`);
  console.log(`Expires: ${expiresAt.toISOString()}`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exitCode = 1;
}

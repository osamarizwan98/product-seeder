// Usage: npm run check-graphql  (reads .env via node --env-file)
import { shopifyGraphQL } from '../lib/shopify.js';

try {
  const data = await shopifyGraphQL({
    shop: process.env.SHOP_DOMAIN,
    clientId: process.env.SHOPIFY_CLIENT_ID,
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET,
    query: '{ shop { name } products(first: 1) { nodes { id title } } }',
  });
  console.log(`Shop:     ${data.shop.name}`);
  console.log(`Products: ${data.products.nodes.length} returned`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exitCode = 1;
}

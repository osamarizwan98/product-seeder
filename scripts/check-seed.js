// Usage: node --env-file=.env scripts/check-seed.js
import { seedProducts } from '../lib/seed.js';

try {
  const results = await seedProducts({
    shop: process.env.SHOP_DOMAIN,
    clientId: process.env.SHOPIFY_CLIENT_ID,
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET,
  });
  for (const r of results) {
    console.log(`${r.status.padEnd(8)} ${r.handle}  ${r.title}${r.error ? `  (${r.error})` : ''}`);
    for (const e of r.userErrors) console.log(`    userError [${e.field?.join('.') ?? '-'}]: ${e.message}${e.code ? ` (${e.code})` : ''}`);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exitCode = 1;
}

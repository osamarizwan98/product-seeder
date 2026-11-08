// Usage: node scripts/check-dummyjson.js
import { fetchProducts } from '../lib/dummyjson.js';

try {
  for (const p of await fetchProducts()) {
    console.log(`#${p.id}  ${p.title}  $${p.price}\n    ${p.image}`);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exitCode = 1;
}

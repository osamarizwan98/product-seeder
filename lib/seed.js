// Seeds dummyjson products into Shopify. The handle `dummyjson-<id>` is the only duplicate guard.
// Docs: https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/productSet
import { fetchProducts } from './dummyjson.js';
import { shopifyGraphQL } from './shopify.js';

const PRODUCT_BY_HANDLE = `
  query ProductByHandle($identifier: ProductIdentifierInput!) {
    productByIdentifier(identifier: $identifier) { id handle title }
  }`;

const PRODUCT_SET = `
  mutation ProductSet($identifier: ProductSetIdentifiers, $input: ProductSetInput!) {
    productSet(identifier: $identifier, input: $input, synchronous: true) {
      product { id }
      userErrors { field message code }
    }
  }`;

const SIZES = ['S', 'M'];

export async function seedProducts({ shop, clientId, clientSecret }) {
  const products = await fetchProducts();
  const results = [];
  const gql = (query, variables) => shopifyGraphQL({ shop, clientId, clientSecret, query, variables });

  // One at a time, in order, so results are predictable and we stay well under rate limits.
  for (const p of products) {
    const handle = `dummyjson-${p.id}`;
    const result = { dummyjsonId: p.id, handle, title: p.title, userErrors: [] };

    try {
      const { productByIdentifier: existing } = await gql(PRODUCT_BY_HANDLE, { identifier: { handle } });
      if (existing) {
        results.push({ ...result, status: 'skipped', productId: existing.id });
        continue;
      }

      const { productSet } = await gql(PRODUCT_SET, { identifier: { handle }, input: buildInput(p, handle) });
      const { userErrors } = productSet;
      if (userErrors.length || !productSet.product) {
        results.push({ ...result, status: 'error', userErrors, error: userErrors.length ? undefined : 'No product returned.' });
      } else {
        results.push({ ...result, status: 'created', productId: productSet.product.id });
      }
    } catch (err) {
      results.push({ ...result, status: 'error', error: err.message });
    }
  }
  return results;
}

function buildInput(p, handle) {
  return {
    handle,
    title: p.title,
    descriptionHtml: `<p>${escapeHtml(p.description)}</p>`,
    status: 'ACTIVE',
    productOptions: [{ name: 'Size', values: SIZES.map((name) => ({ name })) }],
    variants: SIZES.map((size) => ({
      optionValues: [{ optionName: 'Size', name: size }],
      price: p.price.toFixed(2),
      sku: `${handle}-${size}`,
    })),
    files: [{ originalSource: p.image, alt: p.title, contentType: 'IMAGE' }],
  };
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Source products from https://dummyjson.com/docs/products
const COUNT = 3;
const URL = `https://dummyjson.com/products?limit=${COUNT}`;
const TIMEOUT_MS = 10_000;

export async function fetchProducts() {
  let res;
  try {
    res = await fetch(URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    if (err.name === 'TimeoutError') throw new Error(`dummyjson request timed out after ${TIMEOUT_MS / 1000}s.`);
    throw new Error(`Could not reach dummyjson.com: ${err.cause?.code ?? err.message}`);
  }
  if (!res.ok) throw new Error(`dummyjson request failed (HTTP ${res.status}).`);

  const body = await res.json().catch((err) => {
    if (err.name === 'SyntaxError') return null;
    if (err.name === 'TimeoutError') throw new Error(`dummyjson request timed out after ${TIMEOUT_MS / 1000}s.`);
    throw err;
  });
  if (!Array.isArray(body?.products) || body.products.length < COUNT) {
    throw new Error(`dummyjson returned an unexpected response (expected ${COUNT} products).`);
  }

  return body.products
    .slice(0, COUNT)
    .map(normalize)
    .sort((a, b) => a.id - b.id);
}

function normalize(p, i) {
  const product = {
    id: p?.id,
    title: typeof p?.title === 'string' ? p.title.trim() : '',
    description: typeof p?.description === 'string' ? p.description : '',
    price: p?.price,
    image: p?.images?.[0] || p?.thumbnail,
  };
  const missing =
    (!Number.isInteger(product.id) && 'id') ||
    (!product.title && 'title') ||
    (!(Number.isFinite(product.price) && product.price >= 0) && 'price') ||
    (!/^https:\/\/\S+$/.test(product.image ?? '') && 'image URL');
  if (missing) {
    const name = p?.id != null ? `Product (id ${p.id})` : `Product #${i + 1}`;
    throw new Error(`${name} has no valid ${missing}.`);
  }
  return product;
}

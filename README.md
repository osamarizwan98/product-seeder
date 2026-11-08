# Shopify Product Seeder

A small Node + Express app with a settings page and a "Seed store" button. The button takes
3 products from dummyjson.com and creates them in a Shopify store through the Admin GraphQL
API (API version 2026-10), each with 2 variants (Size S and M) and an image.

## Requirements

- Node.js 20 or newer.
- A Shopify Partner organization.
- An app created in the Dev Dashboard, and a dev store created from the same organization.

## Shopify setup

1. In the Dev Dashboard, create an app.
2. Set the access scopes `read_products` and `write_products`.
3. Release a version of the app.
4. Create a dev store in the same organization and install the app on it.
5. Copy the app's Client ID and Client secret.

The client-credentials grant only works for stores in the app's own organization.

## Run

```
npm install
npm start
```

The server prints its URL: `http://127.0.0.1:3000` (set `PORT` to use another port;
`npm run dev` restarts on file changes). Open it, save the shop domain
(`your-store.myshopify.com`), Client ID and Client secret, then click "Seed store".

## How it works

- Token: client-credentials grant, cached in memory until 60 seconds before it expires,
  cleared when settings are saved. On a 401 from the Admin API the token is cleared,
  fetched again and the request is retried once.
- Seeding: products are created with the `productSet` mutation, in order, one at a time.
- No duplicates: each product gets the handle `dummyjson-<id>`. If a product with that handle
  already exists it is skipped; `productSet` also uses that handle as its identifier.
- Errors: GraphQL `userErrors` (field, message, code) and request errors are shown per product
  in the results table.
- To seed more products, change `COUNT` in `lib/dummyjson.js`; existing ones are skipped.

## Project structure

```
server.js              Express server: routes, security headers, Host/Origin checks
lib/settings.js        Reads and writes data/settings.json
lib/token.js           Client-credentials token, in-memory cache, shop domain validation
lib/shopify.js         Admin GraphQL request with timeout and one retry on 401
lib/dummyjson.js       Fetches and validates products from dummyjson.com
lib/seed.js            Skip-or-create logic per product (productByIdentifier + productSet)
lib/view.js            Server-rendered HTML page, all outside values escaped
data/settings.json     Saved settings (created on first save, gitignored)
```

## Notes and limits

- Settings, including the client secret, are stored in plain text in `data/settings.json`
  (gitignored, created with file mode 0600). Intended for local use.
- The server only listens on 127.0.0.1. It rejects requests with an unexpected Host header
  and POST requests with a cross-origin Origin header.
- Every response sets a Content-Security-Policy (including `frame-ancestors 'none'`) and
  `X-Content-Type-Options: nosniff`.
- The latest seed results are kept in memory and are lost on restart.
- Seeding runs sequentially in one request; fine for a few products, not for large catalogs.
- The access token is never written to disk and never shown in the UI.

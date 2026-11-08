# Shopify Product Seeder (paid test task)

## Goal
Small Node + Express app. Settings page (shop domain, client ID, client secret) and a
"Seed store" button that takes 3 products from https://dummyjson.com/products and
creates them in a Shopify dev store via Admin GraphQL (2 variants each + image).
Pressing the button twice must not create duplicates. Show GraphQL userErrors in the UI.
On a 401 from Admin API: `clearToken()` from lib/token.js, then retry once.

## Rules
- Tasks arrive one at a time. Do ONLY what the current task asks; don't touch other files.
- Out of scope: database, auth system, webhooks, metafields, billing.
- No Shopify SDK, no TypeScript, no frontend framework. Built-in fetch only.
- Add a dependency only when needed, and say why.
- Admin API version: 2026-10, kept in a single constant.
- Never log secrets (client secret, access token), including in error messages.
- Every outbound request gets a timeout; validate user input.
- If unsure about a Shopify API detail, check shopify.dev instead of guessing.
- The client reads the code: keep it short and readable.

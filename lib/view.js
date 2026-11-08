// Server-rendered HTML. Every dynamic value goes through escapeHtml.
// `settings` here is { shop, clientId, hasSecret } - the secret itself never reaches this file.

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function renderPage({ settings = {}, results, message, error } = {}) {
  const { shop = '', clientId = '', hasSecret = false } = settings;
  const ready = Boolean(shop && clientId && hasSecret);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Product Seeder</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; max-width: 860px; margin: 2rem auto; padding: 0 1rem; }
  label { display: block; margin: .6rem 0; }
  input { display: block; width: 100%; max-width: 420px; padding: .35rem; }
  button { margin-top: .6rem; padding: .4rem 1rem; }
  table { border-collapse: collapse; width: 100%; margin-top: .6rem; }
  th, td { border: 1px solid #ccc; padding: .35rem .5rem; text-align: left; vertical-align: top; }
  ul { margin: 0; padding-left: 1.1rem; }
  .ok { color: #116329; } .err { color: #b00020; }
</style>
</head>
<body>
<h1>Shopify Product Seeder</h1>
${message ? `<p class="ok">${escapeHtml(message)}</p>` : ''}
${error ? `<p class="err">${escapeHtml(error)}</p>` : ''}

<h2>Settings</h2>
<form method="post" action="/settings">
  <label>Shop domain
    <input name="shop" value="${escapeHtml(shop)}" placeholder="your-store.myshopify.com" required>
  </label>
  <label>Client ID
    <input name="clientId" value="${escapeHtml(clientId)}" required>
  </label>
  <label>Client secret
    <input type="password" name="clientSecret" autocomplete="new-password"
      placeholder="${hasSecret ? 'saved, leave blank to keep' : ''}"${hasSecret ? '' : ' required'}>
  </label>
  <button type="submit">Save settings</button>
</form>

<h2>Seed</h2>
<form method="post" action="/seed">
  <button type="submit"${ready ? '' : ' disabled'}>Seed store</button>
  ${ready ? '' : '<p>Save shop domain, client ID and client secret first.</p>'}
</form>

${results ? renderResults(results) : ''}
</body>
</html>`;
}

function renderResults(results) {
  const count = (status) => results.filter((r) => r.status === status).length;
  const rows = results.map((r) => `
    <tr>
      <td>${escapeHtml(r.status)}</td>
      <td>${escapeHtml(r.handle)}</td>
      <td>${escapeHtml(r.title)}</td>
      <td>${escapeHtml(r.productId)}</td>
      <td>${renderErrors(r)}</td>
    </tr>`).join('');

  return `<h2>Results</h2>
<p>Created: ${escapeHtml(count('created'))} · Skipped: ${escapeHtml(count('skipped'))} · Errors: ${escapeHtml(count('error'))}</p>
<table>
  <thead><tr><th>Status</th><th>Handle</th><th>Title</th><th>Product ID</th><th>Errors</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
}

function renderErrors({ userErrors = [], error }) {
  const items = userErrors.map((e) => {
    const field = e.field?.join('.') ?? '-';
    return `<li>${escapeHtml(field)}: ${escapeHtml(e.message)}${e.code ? ` (${escapeHtml(e.code)})` : ''}</li>`;
  });
  if (error) items.push(`<li>${escapeHtml(error)}</li>`);
  return items.length ? `<ul class="err">${items.join('')}</ul>` : '';
}

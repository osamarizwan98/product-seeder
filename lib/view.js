// Server-rendered HTML. Every value from outside our code goes through escapeHtml.
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
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Product Seeder</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f6f7f9; --card: #fff; --text: #1f2328; --muted: #59636e; --border: #d1d9e0;
    --primary: #1f6feb; --primary-hover: #1858c4; --focus: #1f6feb;
    --ok-bg: #dafbe1; --ok-text: #116329; --ok-border: #4ac26b;
    --err-bg: #ffebe9; --err-text: #a40e26; --err-border: #ff8182;
    --neutral-bg: #eff2f5; --neutral-text: #424a53;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0d1117; --card: #161b22; --text: #e6edf3; --muted: #9198a1; --border: #3d444d;
      --primary-hover: #1a5fd0; --focus: #58a6ff;
      --ok-bg: #12261e; --ok-text: #6fdd8b; --ok-border: #2ea043;
      --err-bg: #2d1214; --err-text: #ff9492; --err-border: #da3633;
      --neutral-bg: #262c36; --neutral-text: #c9d1d9;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  main { max-width: 1024px; margin: 0 auto; padding: 2rem 16px; }
  h1 { font-size: 1.6rem; margin: 0 0 1.25rem; }
  h2 { font-size: 1.15rem; margin: 0 0 .75rem; }
  .card {
    background: var(--card); border: 1px solid var(--border); border-radius: 8px;
    padding: 1.25rem; margin-bottom: 1.25rem;
  }
  label { display: block; margin-bottom: .9rem; font-weight: 600; }
  input {
    display: block; width: 100%; margin-top: .3rem; padding: .55rem .7rem;
    font: inherit; font-weight: 400; color: var(--text); background: var(--card);
    border: 1px solid var(--border); border-radius: 6px;
  }
  input::placeholder { color: var(--muted); font-size: .875em; }
  input:focus, button:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
  button {
    font: inherit; font-weight: 600; padding: .55rem 1.2rem; border: 0; border-radius: 6px;
    background: var(--primary); color: #fff; cursor: pointer;
  }
  button:hover:not(:disabled) { background: var(--primary-hover); }
  button:disabled { opacity: .45; cursor: not-allowed; }
  .muted { color: var(--muted); font-size: .875rem; margin: .75rem 0 0; }
  .msg { padding: .7rem 1rem; border: 1px solid; border-left-width: 4px; border-radius: 6px; margin: 0 0 1.25rem; }
  .msg.ok, .badge[data-status="created"] { background: var(--ok-bg); color: var(--ok-text); border-color: var(--ok-border); }
  .msg.err, .badge[data-status="error"] { background: var(--err-bg); color: var(--err-text); border-color: var(--err-border); }
  .counts { margin: 0 0 .9rem; color: var(--muted); }
  .badge {
    display: inline-block; padding: .1rem .55rem; border: 1px solid var(--border); border-radius: 999px;
    background: var(--neutral-bg); color: var(--neutral-text); font-size: .8rem; font-weight: 600; white-space: nowrap;
  }
  .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 6px; }
  table { border-collapse: collapse; width: 100%; font-size: .9rem; }
  th, td { padding: .6rem .75rem; text-align: left; vertical-align: top; border-bottom: 1px solid var(--border); }
  th { background: var(--neutral-bg); font-weight: 600; white-space: nowrap; }
  tbody tr:last-child td { border-bottom: 0; }
  .errors { margin: 0; padding-left: 1rem; min-width: 12rem; color: var(--err-text); font-size: .85rem; overflow-wrap: anywhere; }
  @media (max-width: 480px) {
    main { padding-top: 1.25rem; }
    .card { padding: 1rem; }
    button { width: 100%; }
  }
</style>
</head>
<body>
<main>
<h1>Shopify Product Seeder</h1>
${message ? `<p class="msg ok">${escapeHtml(message)}</p>` : ''}
${error ? `<p class="msg err">${escapeHtml(error)}</p>` : ''}

<section class="card">
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
</section>

<section class="card">
<h2>Seed</h2>
<form method="post" action="/seed">
  <button type="submit"${ready ? '' : ' disabled'}>Seed store</button>
  ${ready ? '' : '<p class="muted">Save shop domain, client ID and client secret first.</p>'}
</form>
</section>

${results ? renderResults(results) : ''}
</main>
</body>
</html>`;
}

function renderResults(results) {
  const count = (status) => results.filter((r) => r.status === status).length;
  const rows = results.map((r) => `
    <tr>
      <td><span class="badge" data-status="${r.status}">${r.status}</span></td>
      <td>${escapeHtml(r.handle)}</td>
      <td>${escapeHtml(r.title)}</td>
      <td>${escapeHtml(r.productId)}</td>
      <td>${renderErrors(r)}</td>
    </tr>`).join('');

  return `<section class="card">
<h2>Results</h2>
<p class="counts"><span class="badge">Created: ${count('created')}</span> · <span class="badge">Skipped: ${count('skipped')}</span> · <span class="badge">Errors: ${count('error')}</span></p>
<div class="table-wrap">
<table>
  <thead><tr><th>Status</th><th>Handle</th><th>Title</th><th>Product ID</th><th>Errors</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</div>
</section>`;
}

function renderErrors({ userErrors = [], error }) {
  const items = userErrors.map((e) => {
    const field = e.field?.join('.') ?? '-';
    return `<li>${escapeHtml(field)}: ${escapeHtml(e.message)}${e.code ? ` (${escapeHtml(e.code)})` : ''}</li>`;
  });
  if (error) items.push(`<li>${escapeHtml(error)}</li>`);
  return items.length ? `<ul class="errors">${items.join('')}</ul>` : '';
}

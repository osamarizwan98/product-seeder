// Express 5: rejected promises in async handlers go straight to the error middleware.
import express from 'express';
import { loadSettings, saveSettings } from './lib/settings.js';
import { seedProducts } from './lib/seed.js';
import { renderPage } from './lib/view.js';

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.disable('x-powered-by');

let seeding = false;
let lastSeedResults = null; // in memory only: shown on "/?seeded=1" after the redirect

// Everything except the secret is safe to show in the page.
const publicSettings = ({ shop, clientId, clientSecret }) => ({ shop, clientId, hasSecret: Boolean(clientSecret) });

app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
    'X-Content-Type-Options': 'nosniff',
    // Must stay 'same-origin': with 'no-referrer' browsers send "Origin: null" on
    // same-origin form POSTs and the origin check would reject them (403).
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
  });
  next();
});

// DNS-rebinding guard: only answer requests addressed to this machine.
// Basic CSRF guard: a cross-site form post carries a foreign Origin.
const ALLOWED_HOSTS = [`127.0.0.1:${PORT}`, `localhost:${PORT}`];
app.use((req, res, next) => {
  if (!ALLOWED_HOSTS.includes(req.headers.host)) {
    return res.status(403).send(renderPage({ error: 'Forbidden: unexpected Host header.' }));
  }
  if (req.method !== 'POST' || !req.headers.origin) return next();
  let host;
  try {
    host = new URL(req.headers.origin).host;
  } catch {
    host = null; // e.g. "Origin: null"
  }
  if (host && host === req.headers.host) return next();
  res.status(403).send(renderPage({ error: 'Forbidden: cross-origin request.' }));
});

app.use(express.urlencoded({ extended: false, limit: '10kb' }));

app.get('/', async (req, res) => {
  const settings = publicSettings(await loadSettings());
  if (req.query.seeded === '1' && lastSeedResults) {
    return res.send(renderPage({ settings, results: lastSeedResults, message: 'Seed finished.' }));
  }
  const message = req.query.saved === '1' ? 'Settings saved.' : undefined;
  res.send(renderPage({ settings, message }));
});

// Old tabs/bookmarks on a POST-only URL land on the main page instead of a 404.
app.get(['/settings', '/seed'], (req, res) => res.redirect('/'));

app.post('/settings', async (req, res) => {
  const { shop, clientId, clientSecret } = req.body ?? {};
  try {
    await saveSettings({ shop, clientId, clientSecret });
  } catch (err) {
    if (err.code) throw err; // file-system errors (EACCES, ...) go to the generic handler
    const settings = { ...publicSettings(await loadSettings()), shop: shop ?? '', clientId: clientId ?? '' };
    return res.status(400).send(renderPage({ settings, error: err.message }));
  }
  // Post/Redirect/Get: the URL ends on "/", so a reload never re-posts or hits /settings.
  res.redirect(303, '/?saved=1');
});

app.post('/seed', async (req, res) => {
  if (seeding) {
    const settings = publicSettings(await loadSettings());
    return res.status(409).send(renderPage({ settings, error: 'A seed is already running. Try again when it finishes.' }));
  }
  seeding = true; // set before any await so two requests can't both start
  lastSeedResults = null;
  try {
    const settings = await loadSettings();
    const view = publicSettings(settings);
    if (!view.shop || !view.clientId || !view.hasSecret) {
      return res.status(400).send(renderPage({ settings: view, error: 'Settings are incomplete. Save them first.' }));
    }
    lastSeedResults = await seedProducts(settings);
    res.redirect(303, '/?seeded=1'); // Post/Redirect/Get: a reload can't start a second seed
  } finally {
    seeding = false;
  }
});

// Generic message to the browser; only err.message in the log (no stack, no secrets).
app.use(async (err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(`Error on ${req.method} ${req.path}: ${err.message}`);
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  const settings = await loadSettings().then(publicSettings, () => ({}));
  res.status(status).send(renderPage({ settings, error: 'Something went wrong. Check the server log.' }));
});

app.listen(PORT, HOST, () => console.log(`Product seeder on http://${HOST}:${PORT}`));

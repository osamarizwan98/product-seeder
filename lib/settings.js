// Stores shop credentials in data/settings.json (mode 0o600). No database by design.
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { normalizeShop, clearToken } from './token.js';

const FILE = fileURLToPath(new URL('../data/settings.json', import.meta.url));

export async function loadSettings() {
  let raw;
  try {
    raw = await readFile(FILE, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return { shop: '', clientId: '', clientSecret: '' };
    throw new Error('Could not read data/settings.json.');
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('data/settings.json is not valid JSON.');
  }
  return {
    shop: String(data.shop ?? ''),
    clientId: String(data.clientId ?? ''),
    clientSecret: String(data.clientSecret ?? ''),
  };
}

export async function saveSettings({ shop, clientId, clientSecret }) {
  const next = {
    shop: normalizeShop(shop), // throws a clear message for non *.myshopify.com domains
    clientId: String(clientId ?? '').trim(),
    clientSecret: String(clientSecret ?? '').trim(),
  };
  if (!next.clientId) throw new Error('Client ID is required.');

  if (!next.clientSecret) {
    next.clientSecret = (await loadSettings()).clientSecret; // blank = keep the stored secret
    if (!next.clientSecret) throw new Error('Client secret is required.');
  }

  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(next, null, 2), { mode: 0o600 });
  await chmod(FILE, 0o600); // writeFile's mode only applies when the file is first created
  clearToken();
}

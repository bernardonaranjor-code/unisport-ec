/**
 * Unisport Events & Consulting — Express proxy server
 * ============================================================
 *  Workaround para el bug de copia de la plataforma Airo de GoDaddy:
 *  Airo NO copia el contenido de la carpeta `public/` del repo al host.
 *  Solución: en vez de servir archivos locales, proxyeamos cada request
 *  contra raw.githubusercontent.com (URL pública del repo), con caché
 *  en memoria. Así los archivos viven en GitHub y se sirven de ahí.
 *
 *  Pros: bypassa el bug, auto-deploy en cada push (sin Pull from GitHub).
 *  Cons: latencia extra de ~50-200ms en la primera carga (cacheable 60s).
 * ============================================================
 */

const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const REPO_OWNER  = 'bernardonaranjor-code';
const REPO_NAME   = 'unisport-ec';
const REPO_BRANCH = 'main';
const RAW_BASE    = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/public`;

// ---------- Cache en memoria ----------
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000;   // 60 segundos

// MIME helpers
function guessMime(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js':   return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.css':  return 'text/css; charset=utf-8';
    case '.png':  return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif':  return 'image/gif';
    case '.svg':  return 'image/svg+xml';
    case '.ico':  return 'image/x-icon';
    case '.webp': return 'image/webp';
    case '.woff': return 'font/woff';
    case '.woff2':return 'font/woff2';
    case '.txt':  return 'text/plain; charset=utf-8';
    default:      return 'application/octet-stream';
  }
}

async function serveFromGitHub(filename, res) {
  // Sanitize
  if (filename.includes('..')) return res.status(400).send('Bad request');

  const cacheKey = filename;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() < cached.expires) {
    res.set('Content-Type', cached.contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('X-Cache', 'HIT');
    return res.send(cached.body);
  }

  const url = `${RAW_BASE}/${filename}`;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.log(`[404] ${url} → ${r.status}`);
      return res.status(404).send(`File not found: ${filename}`);
    }
    const contentType = guessMime(filename);
    const buf = Buffer.from(await r.arrayBuffer());

    cache.set(cacheKey, {
      body: buf,
      contentType,
      expires: Date.now() + CACHE_TTL_MS
    });
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('X-Cache', 'MISS');
    res.send(buf);
  } catch (e) {
    console.error(`[ERR] fetching ${url}: ${e.message}`);
    res.status(502).send(`Upstream error: ${e.message}`);
  }
}

// ---------- Rutas explicitas (clean URLs) ----------
app.get('/', (_req, res) => serveFromGitHub('index.html', res));

const pages = ['servicios', 'partners', 'insights', 'contacto'];
pages.forEach((slug) => {
  app.get(`/${slug}`, (_req, res) => serveFromGitHub(`${slug}.html`, res));
  app.get(`/${slug}.html`, (_req, res) => serveFromGitHub(`${slug}.html`, res));
});

app.get('/articulo/:slug', (req, res) => {
  serveFromGitHub(`articulo-${req.params.slug}.html`, res);
});

// ---------- /debug — estado del proxy ----------
app.get('/debug', (_req, res) => {
  const stats = {
    proxy_target: RAW_BASE,
    cache_entries: cache.size,
    cache_ttl_ms: CACHE_TTL_MS,
    node_version: process.version,
    cached_files: Array.from(cache.keys()),
  };
  res.type('application/json').send(JSON.stringify(stats, null, 2));
});

// ---------- Wildcard — cualquier otro path (logos, .json, .js, .css) ----------
app.use((req, res) => {
  const filename = req.path.replace(/^\//, '');
  if (!filename || filename === '') return serveFromGitHub('index.html', res);
  serveFromGitHub(filename, res);
});

app.listen(PORT, HOST, () => {
  console.log(`Unisport EC proxy listening on ${HOST}:${PORT}`);
  console.log(`Source: ${RAW_BASE}`);
});

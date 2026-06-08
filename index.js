/**
 * Unisport Events & Consulting — Express server (entry: index.js)
 * Serves the static site from /public on the port that the host provides
 * via process.env.PORT (falls back to 3000 for local development).
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

// Static assets with clean-URL extension fallback ("/servicios" → servicios.html)
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    maxAge: '1h'
  })
);

// Explicit clean-URL routes (defensive)
const cleanRoutes = ['servicios', 'partners', 'insights', 'contacto'];
cleanRoutes.forEach((slug) => {
  app.get(`/${slug}`, (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, `${slug}.html`));
  });
});

// Root → home page
app.get('/', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Article slug pattern (e.g. /articulo/celta360 → articulo-celta360.html)
app.get('/articulo/:slug', (req, res) => {
  const file = path.join(PUBLIC_DIR, `articulo-${req.params.slug}.html`);
  res.sendFile(file, (err) => {
    if (err) res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
});

// 404 → soft redirect to home
app.use((_req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Unisport EC site listening on ${HOST}:${PORT}`);
});

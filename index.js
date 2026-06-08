/**
 * Unisport Events & Consulting — Express server (Airo-resilient)
 *  - Sirve archivos desde /public si existen.
 *  - Si /public está vacío (bug de copia de Airo), devuelve una página de
 *    diagnóstico en / con la lista de qué hay realmente en /app/.
 *  - Endpoint /debug muestra el filesystem para troubleshooting.
 */

const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------- Helpers ----------

function walk(dir, depth = 0, maxDepth = 3) {
  const out = [];
  if (depth > maxDepth) return ['  ...(deeper levels omitted)...'];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { return [`  [error reading ${dir}: ${e.message}]`]; }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(`${'  '.repeat(depth)}📁 ${ent.name}/`);
      out.push(...walk(full, depth + 1, maxDepth));
    } else {
      let size = '';
      try { size = ` (${fs.statSync(full).size}b)`; } catch (_) {}
      out.push(`${'  '.repeat(depth)}📄 ${ent.name}${size}`);
    }
  }
  return out;
}

function publicExistsAndHasIndex() {
  try {
    return fs.existsSync(path.join(PUBLIC_DIR, 'index.html'));
  } catch (_) { return false; }
}

// ---------- /debug — always available ----------

app.get('/debug', (_req, res) => {
  const lines = [
    'Unisport EC — Airo Debug',
    '========================',
    `__dirname: ${__dirname}`,
    `PUBLIC_DIR: ${PUBLIC_DIR}`,
    `public/index.html exists: ${publicExistsAndHasIndex()}`,
    `process.cwd(): ${process.cwd()}`,
    `Node: ${process.version}`,
    '',
    `--- Tree of ${__dirname} (max depth 3) ---`,
    ...walk(__dirname, 0, 3)
  ];
  res.type('text/plain').send(lines.join('\n'));
});

// ---------- Static serving (only if public/ has content) ----------

if (publicExistsAndHasIndex()) {
  app.use(
    express.static(PUBLIC_DIR, {
      extensions: ['html'],
      maxAge: '1h'
    })
  );

  ['servicios', 'partners', 'insights', 'contacto'].forEach((slug) => {
    app.get(`/${slug}`, (_req, res) => {
      res.sendFile(path.join(PUBLIC_DIR, `${slug}.html`));
    });
  });

  app.get('/articulo/:slug', (req, res) => {
    const file = path.join(PUBLIC_DIR, `articulo-${req.params.slug}.html`);
    res.sendFile(file, (err) => {
      if (err) res.redirect('/');
    });
  });

  app.get('/', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

} else {
  // ---------- Fallback: public/ no copy. Sirve página de diagnóstico ----------
  const fallback = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Unisport EC — Setup pendiente</title><style>body{font-family:'Inter',sans-serif;background:#060F26;color:#F5F1E8;margin:0;padding:48px 24px;line-height:1.6}.wrap{max-width:680px;margin:0 auto}h1{font-family:'Cormorant Garamond',serif;color:#C9A961;font-size:36px;margin:0 0 16px}p{color:#8B95A8;margin:0 0 12px}a{color:#C9A961}code{background:rgba(201,169,97,0.1);padding:2px 8px;border-radius:3px;color:#C9A961}</style></head><body><div class="wrap"><h1>Unisport Events &amp; Consulting</h1><p><strong>Servidor activo</strong> — Node corriendo correctamente.</p><p>La carpeta <code>/app/public/</code> está vacía en el host. Esto suele ser un bug de copia del platform de hosting (Airo no incluyó los archivos estáticos durante el clone).</p><p>Para diagnosticar el estado real del filesystem: <a href="/debug">/debug</a></p></div></body></html>`;

  app.get('/', (_req, res) => res.type('text/html').send(fallback));
  app.use((_req, res) => res.type('text/html').send(fallback));
}

app.listen(PORT, HOST, () => {
  console.log(`Unisport EC site listening on ${HOST}:${PORT}`);
  console.log(`public/index.html present: ${publicExistsAndHasIndex()}`);
});

/**
 * ============================================================
 *  Uni Sport EC — Sistema de Internacionalización (i18n)
 *  Cambio de idioma ES / EN sin recarga de página.
 *  Ubicación recomendada en el repo: public/js/i18n.js
 * ============================================================
 *
 *  Orden de prioridad para detectar el idioma inicial:
 *    1. URL query param  (?lang=en)        ← más fuerte (SEO + links compartibles)
 *    2. localStorage     ('unisport-lang') ← elección previa del usuario
 *    3. navigator.language                 ← idioma del navegador (1ra visita)
 *    4. 'es' como fallback
 *
 *  Cómo marcar elementos en el HTML:
 *    Texto plano:   <h1 data-i18n="home.title">Título</h1>
 *    HTML interno:  <p  data-i18n-html="home.lead">...</p>
 *    Atributos:     <input data-i18n-attr="placeholder:form.email" />
 *                   <a     data-i18n-attr="aria-label:nav.menu, title:nav.menu" />
 *    <title>:       <title data-i18n="meta.title">...</title>
 *    Meta desc:     <meta name="description" data-i18n-attr="content:meta.description">
 *
 *  API pública (window.UnisportI18n):
 *    .setLanguage('en')   → cambia el idioma
 *    .getLanguage()       → devuelve el idioma actual
 *    .SUPPORTED           → ['es','en']
 *
 *  Evento global:
 *    document.addEventListener('languagechange', e => console.log(e.detail.lang));
 * ============================================================
 */

(function () {
  'use strict';

  // -------------------- Configuración --------------------
  const STORAGE_KEY  = 'unisport-lang';
  const SUPPORTED    = ['es', 'en'];
  const DEFAULT_LANG = 'es';

  // Ruta donde viven los archivos JSON. Ajustá si los movés.
  const TRANSLATIONS_PATH = '/lang';

  // Cache en memoria para no re-fetchear el mismo idioma.
  const cache = Object.create(null);

  // -------------------- Helpers internos --------------------

  /**
   * Determina el idioma inicial según el orden de prioridad descrito arriba.
   * @returns {'es'|'en'}
   */
  function detectLanguage() {
    // 1) URL ?lang=xx
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    if (urlLang && SUPPORTED.includes(urlLang)) return urlLang;

    // 2) localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.includes(stored)) return stored;
    } catch (_) { /* storage deshabilitado: ignorar */ }

    // 3) Idioma del navegador
    const navLang = (navigator.language || navigator.userLanguage || '')
      .slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(navLang)) return navLang;

    // 4) Fallback
    return DEFAULT_LANG;
  }

  /**
   * Carga el JSON de traducciones (con cache).
   */
  async function loadTranslations(lang) {
    if (cache[lang]) return cache[lang];
    const url = `${TRANSLATIONS_PATH}/${lang}.json`;
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`[i18n] No se pudo cargar ${url} (HTTP ${res.status})`);
    const data = await res.json();
    cache[lang] = data;
    return data;
  }

  /**
   * Resuelve una clave anidada por notación de puntos.
   *   resolve({a:{b:{c:'x'}}}, 'a.b.c') === 'x'
   */
  function resolveKey(obj, path) {
    return path.split('.').reduce(
      (acc, k) => (acc != null && acc[k] != null ? acc[k] : null),
      obj
    );
  }

  /**
   * Aplica el diccionario a todos los elementos marcados del DOM.
   */
  function applyTranslations(dict, lang) {
    // 1) Texto plano — data-i18n="clave"
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const value = resolveKey(dict, el.getAttribute('data-i18n'));
      if (value == null) return;
      if (el.tagName === 'TITLE') document.title = value;
      else                        el.textContent = value;
    });

    // 2) HTML interno — data-i18n-html="clave"
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const value = resolveKey(dict, el.getAttribute('data-i18n-html'));
      if (value != null) el.innerHTML = value;
    });

    // 3) Atributos — data-i18n-attr="placeholder:form.email, aria-label:nav.menu"
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const spec = el.getAttribute('data-i18n-attr');
      spec.split(',').forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s && s.trim());
        if (!attr || !key) return;
        const value = resolveKey(dict, key);
        if (value != null) el.setAttribute(attr, value);
      });
    });

    // 4) <html lang="..">
    document.documentElement.setAttribute('lang', lang);
  }

  /**
   * Marca visualmente el botón activo del switcher.
   */
  function highlightActiveButton(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      const isActive = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  // -------------------- API pública --------------------

  async function setLanguage(lang, opts = {}) {
    const { updateUrl = true } = opts;
    if (!SUPPORTED.includes(lang)) {
      console.warn(`[i18n] Idioma no soportado: ${lang}`);
      return;
    }

    try {
      const dict = await loadTranslations(lang);
      applyTranslations(dict, lang);
      highlightActiveButton(lang);

      try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}

      if (updateUrl) {
        const url = new URL(window.location.href);
        if (lang === DEFAULT_LANG) url.searchParams.delete('lang');
        else                       url.searchParams.set('lang', lang);
        window.history.replaceState({}, '', url.toString());
      }

      document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
    } catch (err) {
      console.error('[i18n] Error al cambiar idioma:', err);
    }
  }

  function init() {
    const initial = detectLanguage();
    setLanguage(initial);

    // Delegación: funciona aunque los botones se añadan al DOM después.
    document.addEventListener('click', e => {
      const btn = e.target.closest('.lang-btn');
      if (!btn) return;
      const lang = btn.getAttribute('data-lang');
      if (lang) setLanguage(lang);
    });
  }

  window.UnisportI18n = {
    setLanguage,
    getLanguage: () => document.documentElement.lang || DEFAULT_LANG,
    SUPPORTED
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

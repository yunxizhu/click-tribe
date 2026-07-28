/**
 * UI i18n: t(key), setLocale, applyDom.
 * Locale packs: window.TRIBE_LOCALES[locale] = { meta, ...flatKeys }
 * Fallback: active → zh-CN → key
 */
(function initTribeI18n(global) {
  'use strict';

  const FALLBACK = 'zh-CN';
  const SUPPORTED = ['zh-CN', 'en', 'ja'];

  function peekStoredLocale() {
    try {
      const raw = localStorage.getItem('clickTribeSettings');
      if (!raw) return FALLBACK;
      const parsed = JSON.parse(raw);
      const loc = String(parsed?.locale || '').trim();
      return SUPPORTED.includes(loc) ? loc : FALLBACK;
    } catch (_) {
      return FALLBACK;
    }
  }

  let locale = peekStoredLocale();

  function pack(loc) {
    const all = global.TRIBE_LOCALES || {};
    return all[loc] || null;
  }

  function lookup(key) {
    const k = String(key || '');
    if (!k) return '';
    const active = pack(locale);
    if (active && Object.prototype.hasOwnProperty.call(active, k) && active[k] != null) {
      return String(active[k]);
    }
    if (locale !== FALLBACK) {
      const fb = pack(FALLBACK);
      if (fb && Object.prototype.hasOwnProperty.call(fb, k) && fb[k] != null) {
        return String(fb[k]);
      }
    }
    return k;
  }

  function interpolate(str, vars) {
    if (!vars || typeof vars !== 'object') return str;
    return String(str).replace(/\{(\w+)\}/g, (_, name) => (
      Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{${name}}`
    ));
  }

  function t(key, vars) {
    return interpolate(lookup(key), vars);
  }

  function setLocale(next) {
    const loc = SUPPORTED.includes(next) ? next : FALLBACK;
    locale = loc;
    try {
      document.documentElement.lang = loc === 'zh-CN' ? 'zh-CN' : loc;
    } catch (_) { /* ignore */ }
    return locale;
  }

  function getLocale() {
    return locale;
  }

  function listLocales() {
    const all = global.TRIBE_LOCALES || {};
    return SUPPORTED.filter((id) => !!all[id]).map((id) => ({
      id,
      label: all[id].meta?.label || id,
    }));
  }

  function applyNode(el) {
    if (!el || el.nodeType !== 1) return;
    const key = el.getAttribute('data-i18n');
    if (key) {
      const text = t(key);
      if (el.tagName === 'TITLE') {
        document.title = text;
      } else if (el.tagName === 'OPTION') {
        el.textContent = text;
      } else {
        el.textContent = text;
      }
    }
    const titleKey = el.getAttribute('data-i18n-title');
    if (titleKey) el.setAttribute('title', t(titleKey));
    const ariaKey = el.getAttribute('data-i18n-aria');
    if (ariaKey) el.setAttribute('aria-label', t(ariaKey));
  }

  function applyDom(root) {
    const scope = root && root.querySelectorAll ? root : document;
    if (document.documentElement) {
      document.documentElement.lang = locale === 'zh-CN' ? 'zh-CN' : locale;
    }
    const titleKey = document.documentElement?.getAttribute('data-i18n-document-title');
    if (titleKey) document.title = t(titleKey);

    const nodes = scope.querySelectorAll
      ? scope.querySelectorAll('[data-i18n], [data-i18n-title], [data-i18n-aria]')
      : [];
    nodes.forEach(applyNode);
    if (scope !== document && scope.matches?.('[data-i18n], [data-i18n-title], [data-i18n-aria]')) {
      applyNode(scope);
    }
  }

  setLocale(locale);

  global.TRIBE_LOCALES = global.TRIBE_LOCALES || {};
  global.TRIBE_I18N = {
    FALLBACK,
    SUPPORTED,
    t,
    setLocale,
    getLocale,
    listLocales,
    applyDom,
    applyNode,
  };
  global.t = t;
})(typeof window !== 'undefined' ? window : globalThis);

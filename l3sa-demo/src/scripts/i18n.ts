// Browser-side language handling for the public pages.

import { strings, type StringKey } from '../i18n/strings';
import type { Lang } from '../../shared/types';

const STORAGE_KEY = 'l3sa-lang';
const listeners: Array<(lang: Lang) => void> = [];

function initialLang(): Lang {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'es' || q === 'en') return q;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
}

let current: Lang = initialLang();

export const getLang = () => current;

export function t(key: StringKey, vars: Record<string, string | number> = {}): string {
  let s: string = strings[current][key] ?? strings.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

/** Re-translates every [data-i18n] element on the page. */
export function applyStatic(root: ParentNode = document): void {
  document.documentElement.lang = current;
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as StringKey);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria as StringKey));
  });
  const title = document.querySelector('title[data-i18n-title]');
  if (title) document.title = t('meta.title');
}

export function setLang(lang: Lang): void {
  current = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* private mode */ }
  const url = new URL(location.href);
  url.searchParams.delete('lang');
  history.replaceState(history.state, '', url);
  applyStatic();
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn: (lang: Lang) => void): void {
  listeners.push(fn);
}

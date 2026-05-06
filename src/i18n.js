const LANG_KEY = 'lang';

const languageDictionaries = {
  es: () => require('./i18n/es.json'),
  en: () => require('./i18n/en.json')
};

let translations = {};
let currentLang = 'es';

function normalizeLang(lang) {
  const value = String(lang || '').toLowerCase();
  if (value.startsWith('en')) return 'en';
  if (value.startsWith('es')) return 'es';
  return 'es';
}

function getDictionary(lang) {
  const safeLang = normalizeLang(lang);
  const loader = languageDictionaries[safeLang] || languageDictionaries.es;
  const dict = loader();
  return dict && typeof dict === 'object' ? dict : {};
}

function detectUserLanguage() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved) return normalizeLang(saved);

  const browserLang = navigator.language || navigator.userLanguage || 'es';
  return normalizeLang(browserLang);
}

function t(key, fallback = '') {
  return translations[key] || fallback || key;
}

function applyTranslations(root = document) {
  if (!root) return;

  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) return;
    el.textContent = t(key);
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (!key) return;
    el.placeholder = t(key);
  });

  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (!key) return;
    el.title = t(key);
  });

  root.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    const key = el.dataset.i18nAriaLabel;
    if (!key) return;
    el.setAttribute('aria-label', t(key));
  });
}

function updateLangUI(root = document) {
  if (!root) return;
  root.querySelectorAll('.lang-btn').forEach((btn) => {
    const lang = btn.dataset.lang || '';
    btn.classList.toggle('active', normalizeLang(lang) === currentLang);
  });
}

function initLanguageSwitcher(root = document) {
  if (!root) return;
  root.querySelectorAll('.lang-btn').forEach((btn) => {
    if (btn.dataset.langBound === 'true') return;
    btn.dataset.langBound = 'true';
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang || 'es';
      loadLanguage(lang).catch((error) => {
        console.error('Error cambiando idioma', error);
      });
    });
  });
  updateLangUI(root);
}

async function loadLanguage(lang) {
  const safeLang = normalizeLang(lang);
  const dict = getDictionary(safeLang);
  translations = { ...dict };
  currentLang = safeLang;
  localStorage.setItem(LANG_KEY, safeLang);
  applyTranslations();
  updateLangUI();
  window.dispatchEvent(new CustomEvent('app:languagechanged', { detail: { lang: safeLang } }));
}

function getCurrentLanguage() {
  return currentLang;
}

module.exports = {
  loadLanguage,
  t,
  applyTranslations,
  detectUserLanguage,
  initLanguageSwitcher,
  updateLangUI,
  getCurrentLanguage
};

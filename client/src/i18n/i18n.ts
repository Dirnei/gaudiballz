import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import de from './de.json';

const STORAGE_KEY = 'gaudi-locale';
const SUPPORTED = ['en', 'de'] as const;

function detectLanguage(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED as readonly string[]).includes(stored)) return stored;
  } catch { /* private browsing or blocked storage */ }

  for (const lang of navigator.languages) {
    const primary = lang.split('-')[0];
    if ((SUPPORTED as readonly string[]).includes(primary)) return primary;
  }

  return 'en';
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, de: { translation: de } },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch { /* private browsing or blocked storage */ }
  document.documentElement.lang = lng;
});

document.documentElement.lang = i18n.language;

export default i18n;

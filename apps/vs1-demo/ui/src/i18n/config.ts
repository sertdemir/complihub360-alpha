import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// Available languages
export const supportedLngs = ['en', 'de', 'es', 'tr'];

i18n
  // load translation using http -> see /public/locales
  .use(HttpBackend)
  // detect user language
  .use(LanguageDetector)
  // pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // init i18next
  .init({
    fallbackLng: 'en',
    supportedLngs,
    // Region auto-detection: browsers report regional tags (de-DE, de-AT,
    // es-MX, tr-TR). Without these two options such tags fail the
    // supportedLngs check and silently fall back to English — with them the
    // device/region language maps onto our four locales automatically.
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    debug: false,

    // Ohne diese beiden faellt i18next auf seinen eingebauten Standard-Namespace
    // 'translation' zurueck und fordert /locales/<lng>/translation.json an — eine
    // Datei, die es hier nie gab. Der SPA-Fallback beantwortete das mit
    // index.html und HTTP 200, i18next parste HTML als JSON: zwei ueberfluessige
    // Roundtrips PRO Seitenaufruf (angeforderte Sprache + en) plus ein
    // dauerhafter Konsolenfehler. Die uebrigen Namespaces laedt jede Komponente
    // weiterhin selbst nach, wenn sie useTranslation('home') o. ae. aufruft.
    defaultNS: 'common',
    ns: ['common'],

    // Priority: explicit URL locale beats the user's saved choice beats the
    // device/region language. Once the toggle is used, localStorage wins.
    detection: {
      order: ['path', 'localStorage', 'navigator'],
      lookupFromPathIndex: 0,
      caches: ['localStorage'],
      convertDetectedLanguage: (lng: string) => lng.split('-')[0],
    },

    backend: {
      // Ensure it loads from root path regardless of current route
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    }
  });

export default i18n;

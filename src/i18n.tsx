import i18n from 'i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import themeConfig from './theme.config';
i18n
    // load translation using http -> see /public/locales
    // learn more: https://github.com/i18next/i18next-http-backend
    .use(Backend)
    // detect user language
    // learn more: https://github.com/i18next/i18next-browser-languageDetector
    .use(LanguageDetector)
    // pass the i18n instance to react-i18next.
    .use(initReactI18next)
    // init i18next
    // for all options read: https://www.i18next.com/overview/configuration-options
    .init({
        fallbackLng: themeConfig.locale || 'en',
        debug: false,
        load: 'languageOnly',
        ns: ['translation'],
        defaultNS: 'translation',
        interpolation: { escapeValue: false },
        backend: {
            // Cache-bust translation files in dev; allow versioned URLs in prod
            loadPath: `/locales/{{lng}}/{{ns}}.json?v=${import.meta.env.DEV ? Date.now() : (import.meta.env.VITE_APP_VERSION || '1')}`
        },
        react: {
            useSuspense: true
        }
    });
export default i18n;

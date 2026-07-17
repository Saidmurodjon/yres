import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import enAuth from "./locales/en/auth.json";
import enCommon from "./locales/en/common.json";
import enNav from "./locales/en/nav.json";
import enSettings from "./locales/en/settings.json";
import ruAuth from "./locales/ru/auth.json";
import ruCommon from "./locales/ru/common.json";
import ruNav from "./locales/ru/nav.json";
import ruSettings from "./locales/ru/settings.json";
import uzAuth from "./locales/uz/auth.json";
import uzCommon from "./locales/uz/common.json";
import uzNav from "./locales/uz/nav.json";
import uzSettings from "./locales/uz/settings.json";

export const SUPPORTED_LANGUAGES = ["uz", "ru", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** localStorage key the language selector (docs/i18n-and-appearance.md's /settings page) writes to. */
export const LANGUAGE_STORAGE_KEY = "yres-language";

// Namespaces are added here as existing pages are migrated
// (docs/i18n-and-appearance.md's Phase 4, one namespace per commit) —
// `common` is the only one seeded so far.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uz: { common: uzCommon, settings: uzSettings, nav: uzNav, auth: uzAuth },
      ru: { common: ruCommon, settings: ruSettings, nav: ruNav, auth: ruAuth },
      en: { common: enCommon, settings: enSettings, nav: enNav, auth: enAuth },
    },
    ns: ["common", "settings", "nav", "auth"],
    // Uzbek is the project's primary language (CLAUDE.md) — used when the
    // browser's language isn't one of the three supported ones.
    fallbackLng: "uz",
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: "common",
    interpolation: { escapeValue: false }, // React already escapes.
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

export default i18n;

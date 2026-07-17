import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import enCommon from "./locales/en/common.json";
import ruCommon from "./locales/ru/common.json";
import uzCommon from "./locales/uz/common.json";

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
      uz: { common: uzCommon },
      ru: { common: ruCommon },
      en: { common: enCommon },
    },
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

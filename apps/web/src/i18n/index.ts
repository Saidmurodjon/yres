import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import enAdmin from "./locales/en/admin.json";
import enAudit from "./locales/en/audit.json";
import enAuth from "./locales/en/auth.json";
import enBuildings from "./locales/en/buildings.json";
import enChat from "./locales/en/chat.json";
import enCommon from "./locales/en/common.json";
import enConsumption from "./locales/en/consumption.json";
import enDashboard from "./locales/en/dashboard.json";
import enEnvelope from "./locales/en/envelope.json";
import enMeasures from "./locales/en/measures.json";
import enNav from "./locales/en/nav.json";
import enProfile from "./locales/en/profile.json";
import enSettings from "./locales/en/settings.json";
import enSystems from "./locales/en/systems.json";
import enVerify from "./locales/en/verify.json";
import ruAdmin from "./locales/ru/admin.json";
import ruAudit from "./locales/ru/audit.json";
import ruAuth from "./locales/ru/auth.json";
import ruBuildings from "./locales/ru/buildings.json";
import ruChat from "./locales/ru/chat.json";
import ruCommon from "./locales/ru/common.json";
import ruConsumption from "./locales/ru/consumption.json";
import ruDashboard from "./locales/ru/dashboard.json";
import ruEnvelope from "./locales/ru/envelope.json";
import ruMeasures from "./locales/ru/measures.json";
import ruNav from "./locales/ru/nav.json";
import ruProfile from "./locales/ru/profile.json";
import ruSettings from "./locales/ru/settings.json";
import ruSystems from "./locales/ru/systems.json";
import ruVerify from "./locales/ru/verify.json";
import uzAdmin from "./locales/uz/admin.json";
import uzAudit from "./locales/uz/audit.json";
import uzAuth from "./locales/uz/auth.json";
import uzBuildings from "./locales/uz/buildings.json";
import uzChat from "./locales/uz/chat.json";
import uzCommon from "./locales/uz/common.json";
import uzConsumption from "./locales/uz/consumption.json";
import uzDashboard from "./locales/uz/dashboard.json";
import uzEnvelope from "./locales/uz/envelope.json";
import uzMeasures from "./locales/uz/measures.json";
import uzNav from "./locales/uz/nav.json";
import uzProfile from "./locales/uz/profile.json";
import uzSettings from "./locales/uz/settings.json";
import uzSystems from "./locales/uz/systems.json";
import uzVerify from "./locales/uz/verify.json";

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
      uz: {
        common: uzCommon,
        settings: uzSettings,
        nav: uzNav,
        auth: uzAuth,
        dashboard: uzDashboard,
        buildings: uzBuildings,
        consumption: uzConsumption,
        measures: uzMeasures,
        envelope: uzEnvelope,
        systems: uzSystems,
        admin: uzAdmin,
        chat: uzChat,
        profile: uzProfile,
        audit: uzAudit,
        verify: uzVerify,
      },
      ru: {
        common: ruCommon,
        settings: ruSettings,
        nav: ruNav,
        auth: ruAuth,
        dashboard: ruDashboard,
        buildings: ruBuildings,
        consumption: ruConsumption,
        measures: ruMeasures,
        envelope: ruEnvelope,
        systems: ruSystems,
        admin: ruAdmin,
        chat: ruChat,
        profile: ruProfile,
        audit: ruAudit,
        verify: ruVerify,
      },
      en: {
        common: enCommon,
        settings: enSettings,
        nav: enNav,
        auth: enAuth,
        dashboard: enDashboard,
        buildings: enBuildings,
        consumption: enConsumption,
        measures: enMeasures,
        envelope: enEnvelope,
        systems: enSystems,
        admin: enAdmin,
        chat: enChat,
        profile: enProfile,
        audit: enAudit,
        verify: enVerify,
      },
    },
    ns: [
      "common",
      "settings",
      "nav",
      "auth",
      "dashboard",
      "buildings",
      "consumption",
      "measures",
      "envelope",
      "systems",
      "admin",
      "chat",
      "profile",
      "audit",
      "verify",
    ],
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

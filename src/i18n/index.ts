import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import ar from "./locales/ar.json";
import pt from "./locales/pt.json";
import zh from "./locales/zh.json";
import hi from "./locales/hi.json";
import de from "./locales/de.json";
import ru from "./locales/ru.json";
import sw from "./locales/sw.json";

export const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "fr", name: "French", native: "Français" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "pt", name: "Portuguese", native: "Português" },
  { code: "zh", name: "Chinese", native: "中文" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "sw", name: "Swahili", native: "Kiswahili" },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
      ar: { translation: ar },
      pt: { translation: pt },
      zh: { translation: zh },
      hi: { translation: hi },
      de: { translation: de },
      ru: { translation: ru },
      sw: { translation: sw },
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
  });

export default i18n;
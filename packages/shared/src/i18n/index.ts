import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import mr from "./mr.json";

export const defaultLanguage = "mr";

export function initI18n() {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      mr: { translation: mr },
    },
    lng: defaultLanguage,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export { i18n };

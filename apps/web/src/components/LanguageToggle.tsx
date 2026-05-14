import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const isMarathi = i18n.language === "mr";

  return (
    <button
      className="btn btn-ghost"
      style={{ fontSize: 13, padding: "6px 12px", minHeight: 36 }}
      onClick={() => i18n.changeLanguage(isMarathi ? "en" : "mr")}
      aria-label="Toggle language"
    >
      {isMarathi ? "EN" : "मराठी"}
    </button>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { events } from "@kothi/shared";
import { LanguageToggle } from "../components/LanguageToggle";

export function Welcome() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [checked1, setChecked1] = useState(false);
  const [checked2, setChecked2] = useState(false);

  const canProceed = checked1 && checked2;

  const handleAgree = () => {
    events.track("wizard_started", { wizard: "budget" });
    navigate("/onboarding");
  };

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 20px 0" }}>
        <LanguageToggle />
      </div>

      <div className="screen-body" style={{ justifyContent: "center", flex: 1 }}>
        {/* Hero card */}
        <div className="animate-fade-up">
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "var(--radius-lg)",
              background: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              boxShadow: "var(--shadow-md)",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>

          <h1 style={{ fontSize: 30, marginBottom: 10 }}>{t("budget.welcome.title")}</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 16, lineHeight: 1.7 }}>
            {t("budget.welcome.subtitle")}
          </p>
        </div>

        {/* Research note */}
        <div className="banner info animate-fade-up animate-fade-up-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{t("budget.welcome.research_note")}</span>
        </div>

        {/* Consent checkboxes */}
        <div className="card animate-fade-up animate-fade-up-3" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ConsentItem
            checked={checked1}
            onChange={setChecked1}
            label={t("budget.welcome.consent_research")}
          />
          <div className="divider" />
          <ConsentItem
            checked={checked2}
            onChange={setChecked2}
            label={t("budget.welcome.consent_advice")}
          />
        </div>
      </div>

      <div className="screen-footer animate-fade-up animate-fade-up-4">
        <button
          className="btn btn-primary btn-full btn-lg"
          disabled={!canProceed}
          onClick={handleAgree}
        >
          {t("budget.welcome.cta")}
        </button>
      </div>
    </div>
  );
}

function ConsentItem({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: `1.5px solid ${checked ? "var(--color-accent)" : "var(--color-border-strong)"}`,
          background: checked ? "var(--color-accent)" : "var(--color-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
          transition: "all 0.15s ease",
        }}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: 15, lineHeight: 1.6, color: "var(--color-text-primary)" }}>
        {label}
      </span>
    </label>
  );
}

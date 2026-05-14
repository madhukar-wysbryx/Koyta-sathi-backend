import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { events } from "@kothi/shared";
import { LanguageToggle } from "../components/LanguageToggle";

export function ReadyToTrack() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const handleGo = () => {
    events.track("wizard_step_completed", { wizard: "budget", step: 15, stepName: "ready" });
    events.track("wizard_completed", { wizard: "budget" });
    navigate("/dashboard");
  };

  return (
    <div className="screen">
      <div className="wizard-header">
        <div />
        <LanguageToggle />
      </div>

      <div className="screen-body" style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px color-mix(in srgb, var(--color-accent) 40%, transparent)",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div>
            <p className="story-module-tag">Step 15 of 17</p>
            <h1 style={{ fontSize: 28, marginBottom: 12 }}>{t("budget.ready.title")}</h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 16, lineHeight: 1.7, maxWidth: 320, margin: "0 auto" }}>
              {t("budget.ready.subtitle")}
            </p>
          </div>

          <div className="card animate-fade-up animate-fade-up-2" style={{ width: "100%", textAlign: "left", display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              "Tap '+ Add New' each time you receive an advance installment",
              "Track the purpose: food, medicine, or other needs",
              "Watch your total debt grow — and know when to pause",
            ].map((tip, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
                  color: "var(--color-accent)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="screen-footer animate-fade-up animate-fade-up-3">
        <button className="btn btn-primary btn-full btn-lg" onClick={handleGo}>
          {t("budget.ready.cta")}
        </button>
      </div>
    </div>
  );
}

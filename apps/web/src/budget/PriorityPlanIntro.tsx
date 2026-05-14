import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { events } from "@kothi/shared";
import { LanguageToggle } from "../components/LanguageToggle";
import { TTSButton } from "../components/TTSButton";

const INTRO_TEXT = "Now let's build your priority plan. You will list the things you want to spend your advance on — food, medicine, school fees, and more. Then we'll help you decide which ones are truly necessary and which ones can wait. This becomes your personal budget for the season.";

export function PriorityPlanIntro() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();

  const handleStart = () => {
    events.track("wizard_step_completed", { wizard: "budget", step: 11, stepName: "priority_intro" });
    navigate("/priority-1");
  };

  return (
    <div className="screen">
      <div className="wizard-header">
        <button className="btn btn-ghost" style={{ padding: "8px 4px" }} onClick={() => navigate("/advance-plan")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TTSButton text={INTRO_TEXT} />
          <LanguageToggle />
        </div>
      </div>

      <div className="screen-body" style={{ justifyContent: "center" }}>
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "var(--radius-lg)",
              background: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>

          <div>
            <p className="story-module-tag">Step 10 of 17</p>
            <h2>{t("budget.priority_intro.title")}</h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: 16, lineHeight: 1.7, marginTop: 10 }}>
              {t("budget.priority_intro.subtitle")}
            </p>
          </div>

          <p className="story-text">{INTRO_TEXT}</p>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { icon: "1", label: "List your planned expenses" },
              { icon: "2", label: "Mark each as Must Have or Can Wait" },
              { icon: "3", label: "See your priority advance amount" },
            ].map((step) => (
              <div key={step.icon} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "var(--color-accent)", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>
                  {step.icon}
                </div>
                <span style={{ fontSize: 14, color: "var(--color-text-primary)" }}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="screen-footer animate-fade-up animate-fade-up-3">
        <button className="btn btn-primary btn-full btn-lg" onClick={handleStart}>
          {t("budget.priority_intro.cta")}
        </button>
      </div>
    </div>
  );
}

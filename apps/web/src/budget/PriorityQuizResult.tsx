import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { events } from "@kothi/shared";
import { LanguageToggle } from "../components/LanguageToggle";
import { useBudgetStore } from "./store";

export function PriorityQuizResult() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const entries = useBudgetStore((s) => s.priorityQuizEntries);

  const mustHave = entries.filter((e) => e.choice === "must");
  const cantWait = entries.filter((e) => e.choice === "cant_wait");

  const handleContinue = () => {
    events.track("wizard_step_completed", { wizard: "budget", step: 8, stepName: "priority_quiz_result" });
    navigate("/recall-2024");
  };

  return (
    <div className="screen">
      <div className="wizard-header">
        <button className="btn btn-ghost" style={{ padding: "8px 4px" }} onClick={() => navigate("/priority-quiz")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <LanguageToggle />
      </div>

      <div className="screen-body">
        <div className="animate-fade-up">
          <p className="story-module-tag">Step 8 of 19</p>
          <h2>Geeta Tai's Priority Plan</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 15, marginTop: 8, lineHeight: 1.6 }}>
            Here is how you helped Geeta Tai sort her expenses. This is the kind of thinking that helps a family take only the advance they truly need.
          </p>
        </div>

        {/* Summary counts */}
        <div
          className="animate-fade-up animate-fade-up-2"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <div
            className="card"
            style={{ textAlign: "center", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}
          >
            <span style={{ fontSize: 28, fontWeight: 800, color: "var(--color-accent)" }}>
              {mustHave.length}
            </span>
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Must Have</span>
          </div>
          <div
            className="card"
            style={{ textAlign: "center", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}
          >
            <span style={{ fontSize: 28, fontWeight: 800, color: "var(--color-text-muted)" }}>
              {cantWait.length}
            </span>
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Can't Wait</span>
          </div>
        </div>

        {/* Must Have list */}
        {mustHave.length > 0 && (
          <div className="animate-fade-up animate-fade-up-3" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Must Have
            </p>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 0, padding: 0, overflow: "hidden" }}>
              {mustHave.map((entry, i) => (
                <div
                  key={entry.category}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: i < mustHave.length - 1 ? "0.5px solid var(--color-border)" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--color-accent)",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 15, color: "var(--color-text-primary)" }}>{entry.category}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                      color: "var(--color-accent)",
                    }}
                  >
                    MUST
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Can't Wait list */}
        {cantWait.length > 0 && (
          <div className="animate-fade-up animate-fade-up-4" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Can't Wait
            </p>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 0, padding: 0, overflow: "hidden" }}>
              {cantWait.map((entry, i) => (
                <div
                  key={entry.category}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: i < cantWait.length - 1 ? "0.5px solid var(--color-border)" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--color-border-strong, var(--color-text-muted))",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 15, color: "var(--color-text-primary)" }}>{entry.category}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: "var(--color-border)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    WAIT
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reflection banner */}
        <div className="banner info animate-fade-up animate-fade-up-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span style={{ fontStyle: "italic", fontSize: 14 }}>
            Separating must-haves from urgent wants is the hardest — and most important — part of planning a budget.
          </span>
        </div>
      </div>

      <div className="screen-footer">
        <button className="btn btn-primary btn-full btn-lg" onClick={handleContinue}>
          {t("common.continue")}
        </button>
      </div>
    </div>
  );
}

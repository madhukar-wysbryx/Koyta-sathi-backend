import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { events } from "@kothi/shared";
import { LanguageToggle } from "../components/LanguageToggle";
import { useBudgetStore } from "./store";

type Choice = "must" | "cant_wait";

const CATEGORIES = [
  { key: "food",       label: "Food & Groceries" },
  { key: "health",     label: "Health & Medicine" },
  { key: "home",       label: "Home & Repairs" },
  { key: "education",  label: "Children's Education" },
  { key: "clothing",   label: "Clothing & Footwear" },
  { key: "debt",       label: "Debt Repayment" },
  { key: "travel",     label: "Travel & Transport" },
  { key: "ceremonies", label: "Ceremonies & Festivals" },
  { key: "savings",    label: "Savings & Emergency Fund" },
  { key: "tools",      label: "Tools & Work Equipment" },
];

export function PriorityQuiz() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const setPriorityQuiz = useBudgetStore((s) => s.setPriorityQuiz);
  const [choices, setChoices] = useState<Record<string, Choice>>({});

  const answered = CATEGORIES.filter((c) => choices[c.key] !== undefined).length;
  const allAnswered = answered === CATEGORIES.length;

  const handleChoice = (key: string, choice: Choice) => {
    setChoices((prev) => ({ ...prev, [key]: choice }));
  };

  const handleContinue = () => {
    const entries = CATEGORIES.map((c) => ({ category: c.label, choice: choices[c.key] }));
    setPriorityQuiz(entries);
    events.track("wizard_step_completed", { wizard: "budget", step: 7, stepName: "priority_quiz" });
    navigate("/priority-quiz-result");
  };

  return (
    <div className="screen">
      <div className="wizard-header">
        <button className="btn btn-ghost" style={{ padding: "8px 4px" }} onClick={() => navigate("/story/jagdish")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <LanguageToggle />
      </div>

      <div className="screen-body">
        <div className="animate-fade-up">
          <p className="story-module-tag">Step 7 of 19</p>
          <h2>Help Geeta Tai Plan</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 15, marginTop: 8, lineHeight: 1.6 }}>
            Geeta Tai is planning her advance budget. For each category, decide whether it is a{" "}
            <strong>Must Have</strong> this season or something that <strong>Can't Wait</strong> — urgent but needs careful thought.
          </p>
        </div>

        {answered > 0 && answered < CATEGORIES.length && (
          <div className="banner info animate-fade-up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ fontSize: 13 }}>{answered} of {CATEGORIES.length} categories answered</span>
          </div>
        )}

        <div className="animate-fade-up animate-fade-up-2" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CATEGORIES.map((cat) => {
            const selected = choices[cat.key];
            return (
              <div
                key={cat.key}
                style={{
                  padding: "14px 16px",
                  borderRadius: "var(--radius-md)",
                  border: `0.5px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
                  background: "var(--color-surface)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  transition: "border-color 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {cat.label}
                  </span>
                  {selected && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 20,
                        background: selected === "must"
                          ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
                          : "var(--color-border)",
                        color: selected === "must" ? "var(--color-accent)" : "var(--color-text-muted)",
                      }}
                    >
                      {selected === "must" ? "MUST HAVE" : "CAN'T WAIT"}
                    </span>
                  )}
                </div>

                <div className="toggle-group">
                  <button
                    className={`toggle-item ${selected === "must" ? "active" : ""}`}
                    onClick={() => handleChoice(cat.key, "must")}
                  >
                    Must Have
                  </button>
                  <button
                    className={`toggle-item ${selected === "cant_wait" ? "active" : ""}`}
                    onClick={() => handleChoice(cat.key, "cant_wait")}
                  >
                    Can't Wait
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="screen-footer">
        <button
          className="btn btn-primary btn-full btn-lg"
          disabled={!allAnswered}
          onClick={handleContinue}
        >
          {t("common.continue")}
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { events } from "@kothi/shared";
import { pToRupee, sumMustHavePaise } from "@kothi/shared/types/budget";
import type { Classification, PriorityCategory } from "@kothi/shared/types/budget";
import { LanguageToggle } from "../components/LanguageToggle";
import { useBudgetStore } from "./store";

export function PriorityPlanStage2() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { state, setPriorityCategories, markPrioritizationComplete } = useBudgetStore();

  const [categories, setCategories] = useState<PriorityCategory[]>(state.priorityCategories);

  const classify = (idx: number, val: Classification) => {
    setCategories((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, classification: val } : c))
    );
  };

  const allClassified = categories.every((c) => c.classification !== "unclassified");
  const mustHavePaise = sumMustHavePaise(categories);
  const plannedPaise = state.planning?.plannedAdvancePaise ?? 0;

  const handleGenerate = () => {
    setPriorityCategories(categories);
    markPrioritizationComplete();
    events.track("wizard_step_completed", { wizard: "budget", step: 13, stepName: "priority_stage2" });
    navigate("/budget-pdf");
  };

  return (
    <div className="screen">
      <div className="wizard-header">
        <button className="btn btn-ghost" style={{ padding: "8px 4px" }} onClick={() => navigate("/priority-1")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <LanguageToggle />
      </div>

      <div className="screen-body">
        <div className="animate-fade-up">
          <p className="story-module-tag">Step 12 of 17</p>
          <h2>{t("budget.priority_stage2.title")}</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginTop: 4 }}>
            {t("budget.priority_stage2.subtitle")}
          </p>
        </div>

        <div className="banner info animate-fade-up animate-fade-up-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span style={{ fontSize: 13 }}>{t("budget.priority_stage2.expert_tip")}</span>
        </div>

        <div className="animate-fade-up animate-fade-up-3" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {categories.map((cat, i) => (
            <div
              key={i}
              style={{
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                border: "0.5px solid var(--color-border)",
                background: "var(--color-surface)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>{cat.label}</span>
                  {cat.amountPaise > 0 && (
                    <span style={{ fontSize: 13, color: "var(--color-text-muted)", marginLeft: 8 }}>
                      ₹{pToRupee(cat.amountPaise)}
                    </span>
                  )}
                </div>
                {cat.classification === "must" && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-accent)", background: "color-mix(in srgb, var(--color-accent) 12%, transparent)", padding: "2px 8px", borderRadius: 20 }}>
                    MUST
                  </span>
                )}
                {cat.classification === "wait" && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", background: "var(--color-border)", padding: "2px 8px", borderRadius: 20 }}>
                    WAIT
                  </span>
                )}
              </div>

              <div className="toggle-group">
                <button
                  className={`toggle-item ${cat.classification === "must" ? "active" : ""}`}
                  onClick={() => classify(i, "must")}
                >
                  {t("budget.priority_stage2.must")}
                </button>
                <button
                  className={`toggle-item ${cat.classification === "wait" ? "active" : ""}`}
                  onClick={() => classify(i, "wait")}
                >
                  {t("budget.priority_stage2.wait")}
                </button>
              </div>
            </div>
          ))}
        </div>

        {allClassified && (
          <div className="card animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                {t("budget.priority_stage2.priority_advance")}
              </span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--color-accent)" }}>
                ₹{pToRupee(mustHavePaise)}
              </span>
            </div>

            {plannedPaise > 0 && mustHavePaise > plannedPaise && (
              <div className="banner" style={{ borderColor: "var(--color-error, #dc2626)", background: "color-mix(in srgb, #dc2626 8%, transparent)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span style={{ fontSize: 13, color: "#dc2626" }}>
                  Your must-haves exceed your planned advance. Consider moving some categories to "Can Wait".
                </span>
              </div>
            )}

            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
              {t("budget.priority_stage2.priority_note")}
            </p>
          </div>
        )}
      </div>

      <div className="screen-footer">
        <button
          className="btn btn-primary btn-full btn-lg"
          disabled={!allClassified}
          onClick={handleGenerate}
        >
          {t("budget.priority_stage2.cta")}
        </button>
      </div>
    </div>
  );
}

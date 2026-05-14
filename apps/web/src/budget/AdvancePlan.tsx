import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { events } from "@kothi/shared";
import { computeRepaymentMonths, pToRupee } from "@kothi/shared/types/budget";
import { LanguageToggle } from "../components/LanguageToggle";
import { useBudgetStore, rupeeToPaise } from "./store";

export function AdvancePlan() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { state, setPlanning } = useBudgetStore();

  const arrears = state.recall2025?.arrearsRemainingPaise ?? 0;
  const initialRupees = state.planning
    ? pToRupee(state.planning.plannedAdvancePaise)
    : "";

  const [rupees, setRupees] = useState(initialRupees);
  const [confirmed, setConfirmed] = useState(false);

  const paise = rupeeToPaise(rupees || "0");
  const months = computeRepaymentMonths(paise, state.recall2024, state.recall2025, arrears > 0);
  const hasArrears = arrears > 0;

  const handleConfirm = () => {
    if (!paise || paise <= 0) return;
    setPlanning(paise);
    setConfirmed(true);
  };

  const handleContinue = () => {
    events.track("wizard_step_completed", { wizard: "budget", step: 10, stepName: "advance_plan" });
    navigate("/priority-intro");
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
          <p className="story-module-tag">Step 9 of 17</p>
          <h2>{t("budget.advance_plan.title")}</h2>
        </div>

        <div className="animate-fade-up animate-fade-up-2" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="input-group">
            <label className="input-label">{t("budget.advance_plan.label")}</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                color: "var(--color-text-muted)", fontSize: 16, fontWeight: 600,
              }}>₹</span>
              <input
                className="input"
                style={{ paddingLeft: 28, fontSize: 20, height: 52 }}
                type="number"
                inputMode="numeric"
                min="0"
                step="1000"
                placeholder="0"
                value={rupees}
                onChange={(e) => { setRupees(e.target.value); setConfirmed(false); }}
              />
            </div>
          </div>

          {paise > 0 && (
            <div className="card animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                  {t("budget.advance_plan.estimate_label")}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-accent)" }}>
                  {hasArrears
                    ? t("budget.advance_plan.estimate_arrears", { arrears: pToRupee(arrears), months })
                    : t("budget.advance_plan.estimate_value", { months })}
                </span>
              </div>

              <div className="banner info" style={{ padding: "10px 12px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span style={{ fontSize: 13 }}>{t("budget.advance_plan.broad_note")}</span>
              </div>
            </div>
          )}

          {!confirmed && paise > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className="animate-fade-up animate-fade-up-3">
              <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                {t("budget.advance_plan.revise_question")}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => { setRupees(""); setConfirmed(false); }}
                >
                  {t("budget.advance_plan.revise_yes")}
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleConfirm}>
                  {t("budget.advance_plan.revise_no")}
                </button>
              </div>
            </div>
          )}

          {confirmed && (
            <div className="banner" style={{ borderColor: "var(--color-accent)", background: "color-mix(in srgb, var(--color-accent) 8%, transparent)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>
                Planned: ₹{pToRupee(paise)} over ~{months} months
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="screen-footer">
        <button
          className="btn btn-primary btn-full btn-lg"
          disabled={!confirmed}
          onClick={handleContinue}
        >
          {t("common.continue")}
        </button>
      </div>
    </div>
  );
}

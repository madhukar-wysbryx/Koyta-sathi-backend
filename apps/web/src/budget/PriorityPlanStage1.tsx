import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { events } from "@kothi/shared";
import { pToRupee } from "@kothi/shared/types/budget";
import type { PriorityCategory } from "@kothi/shared/types/budget";
import { LanguageToggle } from "../components/LanguageToggle";
import { useBudgetStore, rupeeToPaise } from "./store";

interface EntryForm {
  label: string;
  amount: string;
}

const MAX_CATEGORIES = 10;

const SUGGESTIONS = ["Food", "Medicine", "School fees", "Travel", "Clothing", "House repairs", "Debt repayment", "Emergency fund"];

export function PriorityPlanStage1() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { state, setPriorityCategories } = useBudgetStore();

  const [categories, setCategories] = useState<PriorityCategory[]>(
    state.priorityCategories.length > 0
      ? state.priorityCategories
      : []
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EntryForm>({ mode: "onSubmit" });

  const totalPaise = categories.reduce((sum, c) => sum + c.amountPaise, 0);
  const canAdd = categories.length < MAX_CATEGORIES;

  const onAdd = (data: EntryForm) => {
    const newCat: PriorityCategory = {
      position: categories.length,
      label: data.label.trim(),
      amountPaise: rupeeToPaise(data.amount),
      classification: "unclassified",
    };
    setCategories((prev) => [...prev, newCat]);
    reset();
  };

  const handleRemove = (idx: number) => {
    setCategories((prev) => prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, position: i })));
  };

  const handleContinue = () => {
    setPriorityCategories(categories);
    events.track("wizard_step_completed", { wizard: "budget", step: 12, stepName: "priority_stage1" });
    navigate("/priority-2");
  };

  const addSuggestion = (label: string) => {
    if (!canAdd || categories.some((c) => c.label.toLowerCase() === label.toLowerCase())) return;
    setCategories((prev) => [
      ...prev,
      { position: prev.length, label, amountPaise: 0, classification: "unclassified" },
    ]);
  };

  return (
    <div className="screen">
      <div className="wizard-header">
        <button className="btn btn-ghost" style={{ padding: "8px 4px" }} onClick={() => navigate("/priority-intro")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <LanguageToggle />
      </div>

      <div className="screen-body">
        <div className="animate-fade-up">
          <p className="story-module-tag">Step 11 of 17</p>
          <h2>{t("budget.priority_stage1.title")}</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14, marginTop: 4 }}>
            {t("budget.priority_stage1.subtitle")}
          </p>
        </div>

        {/* Quick-add suggestions */}
        <div className="animate-fade-up animate-fade-up-2" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {SUGGESTIONS.map((s) => {
            const added = categories.some((c) => c.label.toLowerCase() === s.toLowerCase());
            return (
              <button
                key={s}
                onClick={() => addSuggestion(s)}
                disabled={added || !canAdd}
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  border: `0.5px solid ${added ? "var(--color-border)" : "var(--color-accent)"}`,
                  background: added ? "var(--color-surface)" : "transparent",
                  color: added ? "var(--color-text-muted)" : "var(--color-accent)",
                  fontSize: 13,
                  cursor: added || !canAdd ? "default" : "pointer",
                  opacity: !canAdd && !added ? 0.4 : 1,
                }}
              >
                {added ? "✓ " : "+ "}{s}
              </button>
            );
          })}
        </div>

        {/* Add form */}
        {canAdd && (
          <form
            onSubmit={handleSubmit(onAdd)}
            className="card animate-fade-up animate-fade-up-3"
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "flex-end" }}>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">{t("budget.priority_stage1.category_label")}</label>
                <input
                  className={`input ${errors.label ? "input-error" : ""}`}
                  placeholder="e.g. Food, Medicine…"
                  {...register("label", { required: true })}
                />
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label className="input-label">{t("budget.priority_stage1.amount_label")}</label>
                <div style={{ position: "relative" }}>
                  <span style={{
                    position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                    color: "var(--color-text-muted)", fontSize: 14,
                  }}>₹</span>
                  <input
                    className={`input ${errors.amount ? "input-error" : ""}`}
                    style={{ paddingLeft: 22, width: 100 }}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    {...register("amount", { required: true, min: 1 })}
                  />
                </div>
              </div>
            </div>
            <button type="submit" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>
              {t("budget.priority_stage1.add")}
            </button>
          </form>
        )}

        {!canAdd && (
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", textAlign: "center" }}>
            {t("budget.priority_stage1.max_note")}
          </p>
        )}

        {/* Category list */}
        {categories.length > 0 && (
          <div className="animate-fade-up animate-fade-up-4" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {categories.map((cat, i) => (
              <div key={i} className="ledger-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{cat.label}</span>
                  {cat.amountPaise > 0 && (
                    <span style={{ fontSize: 13, color: "var(--color-text-muted)", marginLeft: 8 }}>₹{pToRupee(cat.amountPaise)}</span>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(i)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 4 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}

            {totalPaise > 0 && (
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", textAlign: "right", paddingRight: 4 }}>
                {t("budget.priority_stage1.total", { amount: pToRupee(totalPaise) })}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="screen-footer">
        <button
          className="btn btn-primary btn-full btn-lg"
          disabled={categories.length === 0}
          onClick={handleContinue}
        >
          {t("common.continue")}
        </button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { events } from "@kothi/shared";
import { pToRupee } from "@kothi/shared/types/budget";
import { useBudgetStore, rupeeToPaise } from "./store";

interface InstallmentForm {
  amount: string;
  purpose: string;
  occurredOn: string;
}

const PURPOSES = ["food", "seeds", "health", "travel", "debt", "other"] as const;

const PURPOSE_ICONS: Record<string, string> = {
  food: "🌾", seeds: "🌱", health: "💊", travel: "🚌", debt: "💰", other: "📋",
};

export function BudgetLedger() {
  const { t } = useTranslation();
  const { state, addInstallment } = useBudgetStore();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const { register, handleSubmit, watch, reset, formState: { isValid } } = useForm<InstallmentForm>({
    mode: "onChange",
    defaultValues: { occurredOn: new Date().toISOString().split("T")[0] },
  });

  const selectedPurpose = watch("purpose");

  const filtered = state.installments.filter((inst) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inst.purpose.toLowerCase().includes(q) ||
      inst.occurredOn.includes(q) ||
      pToRupee(inst.amountPaise).includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
  const totalPaise = state.installments.reduce((s, i) => s + i.amountPaise, 0);

  const onAdd = (data: InstallmentForm) => {
    addInstallment({
      amountPaise: rupeeToPaise(data.amount),
      purpose: data.purpose,
      occurredOn: data.occurredOn,
    });
    events.track("installment_added", { purposeCategory: data.purpose });
    reset({ occurredOn: new Date().toISOString().split("T")[0] });
    setShowAdd(false);
  };

  return (
    <div style={{ minHeight: "100%", paddingBottom: 96, position: "relative", background: "var(--color-bg)" }}>

      {/* Header */}
      <div style={{ padding: "22px 24px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.3px" }}>
            {t("budget.add_installment.title", "Ledger")}
          </h2>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600, background: "var(--color-surface-raised)", padding: "4px 10px", borderRadius: "var(--radius-pill)", marginTop: 4 }}>
            {state.installments.length} entries
          </span>
        </div>

        {totalPaise > 0 && (
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 16, marginTop: 2 }}>
            Total: <strong style={{ color: "var(--color-accent)", fontFamily: "var(--font-display)", fontSize: 16 }}>₹{pToRupee(totalPaise)}</strong>
          </p>
        )}

        {/* Search */}
        <div style={{ position: "relative" }}>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="input"
            style={{ paddingLeft: 40, background: "var(--color-surface)" }}
            placeholder="Search by purpose, date, or amount…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ padding: "0 16px" }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 0" }}>
            <div style={{ width: 64, height: 64, borderRadius: "var(--radius-lg)", background: "var(--color-surface-raised)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
              {search ? "No entries match your search." : t("budget.dashboard.no_entries")}
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: "4px 0", overflow: "hidden" }}>
            {sorted.map((inst, idx) => (
              <div
                key={inst.id}
                className="ledger-row"
                style={{
                  borderBottom: idx < sorted.length - 1 ? "1px solid var(--color-border)" : "none",
                  padding: "14px 16px",
                  margin: 0,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: "var(--radius-sm)",
                  background: "var(--color-accent-light)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, flexShrink: 0,
                }}>
                  {PURPOSE_ICONS[inst.purpose] ?? "📋"}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "-0.2px" }}>
                    ₹{pToRupee(inst.amountPaise)}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                    {t(`budget.add_installment.purposes.${inst.purpose}`, inst.purpose)} · {inst.occurredOn}
                  </p>
                </div>
                <span style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: "var(--radius-pill)",
                  background: "var(--color-accent-light)",
                  color: "var(--color-accent)", fontWeight: 700, textTransform: "capitalize",
                  letterSpacing: "0.02em",
                }}>
                  {inst.purpose}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setShowAdd(true)} aria-label="Add installment">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Add installment bottom sheet */}
      {showAdd && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "flex-end" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
        >
          <div
            className="animate-fade-up"
            style={{
              width: "100%", background: "var(--color-surface)",
              borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
              padding: "8px 20px 40px",
              display: "flex", flexDirection: "column", gap: 16,
              maxHeight: "92dvh", overflowY: "auto",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            {/* Drag handle */}
            <div style={{ width: 40, height: 4, borderRadius: 99, background: "var(--color-border-strong)", margin: "12px auto 4px" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>{t("budget.add_installment.title")}</h3>
              <button
                onClick={() => setShowAdd(false)}
                style={{ width: 32, height: 32, background: "var(--color-surface-raised)", border: "none", cursor: "pointer", color: "var(--color-text-muted)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onAdd)} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div className="input-group">
                <label className="input-label">{t("budget.add_installment.amount")}</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", fontSize: 18, fontWeight: 600, fontFamily: "var(--font-display)" }}>₹</span>
                  <input
                    className="input"
                    style={{ paddingLeft: 34, fontSize: 28, height: 64, fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "-0.5px" }}
                    type="number" inputMode="numeric" min="1" placeholder="0"
                    {...register("amount", { required: true, min: 1 })}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">{t("budget.add_installment.purpose")}</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {PURPOSES.map((p) => (
                    <label
                      key={p}
                      style={{
                        padding: "10px 16px", borderRadius: "var(--radius-pill)", cursor: "pointer", fontSize: 14,
                        border: `1px solid ${selectedPurpose === p ? "var(--color-accent)" : "var(--color-border-strong)"}`,
                        background: selectedPurpose === p ? "var(--color-accent-light)" : "var(--color-surface)",
                        color: selectedPurpose === p ? "var(--color-accent)" : "var(--color-text-secondary)",
                        fontWeight: selectedPurpose === p ? 700 : 500,
                        transition: "all 0.15s ease",
                        display: "flex", alignItems: "center", gap: 6,
                        boxShadow: selectedPurpose === p ? "0 0 0 3px var(--color-accent-light)" : "none",
                      }}
                    >
                      <input type="radio" value={p} {...register("purpose", { required: true })} style={{ display: "none" }} />
                      <span>{PURPOSE_ICONS[p]}</span>
                      {t(`budget.add_installment.purposes.${p}`)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">{t("budget.add_installment.date")}</label>
                <input className="input" type="date" {...register("occurredOn", { required: true })} />
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={!isValid}>
                {t("budget.add_installment.save")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

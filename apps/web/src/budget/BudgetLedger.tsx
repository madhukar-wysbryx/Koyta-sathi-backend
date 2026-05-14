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

  // Sort by date descending (newest first)
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
    <div style={{ minHeight: "100%", paddingBottom: 80, position: "relative" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>{t("budget.add_installment.title", "Ledger")}</h2>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
            {state.installments.length} entries
          </p>
        </div>

        {totalPaise > 0 && (
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 14 }}>
            Total taken: <strong style={{ color: "var(--color-accent)" }}>₹{pToRupee(totalPaise)}</strong>
          </p>
        )}

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search by purpose, date, or amount…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" style={{ margin: "0 auto 12px", display: "block" }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
              {search ? "No entries match your search." : t("budget.dashboard.no_entries")}
            </p>
          </div>
        ) : (
          sorted.map((inst) => (
            <div key={inst.id} className="ledger-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600 }}>₹{pToRupee(inst.amountPaise)}</p>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                  {t(`budget.add_installment.purposes.${inst.purpose}`, inst.purpose)} · {inst.occurredOn}
                </p>
              </div>
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 20,
                background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                color: "var(--color-accent)", fontWeight: 600, textTransform: "capitalize",
              }}>
                {inst.purpose}
              </span>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setShowAdd(true)} aria-label="Add installment">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Add installment bottom sheet */}
      {showAdd && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "flex-end" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
        >
          <div style={{
            width: "100%", background: "var(--color-bg)",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
            padding: "24px 20px 40px", display: "flex", flexDirection: "column", gap: 16,
            maxHeight: "90dvh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{t("budget.add_installment.title")}</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 4 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit(onAdd)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="input-group">
                <label className="input-label">{t("budget.add_installment.amount")}</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", fontSize: 15, fontWeight: 500 }}>₹</span>
                  <input
                    className="input"
                    style={{ paddingLeft: 28, fontSize: 22, height: 54 }}
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
                        padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontSize: 14,
                        border: `0.5px solid ${selectedPurpose === p ? "var(--color-accent)" : "var(--color-border)"}`,
                        background: selectedPurpose === p ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "transparent",
                        color: selectedPurpose === p ? "var(--color-accent)" : "var(--color-text-primary)",
                        fontWeight: selectedPurpose === p ? 600 : 400,
                        transition: "all 0.15s",
                      }}
                    >
                      <input type="radio" value={p} {...register("purpose", { required: true })} style={{ display: "none" }} />
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

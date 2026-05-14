import { useTranslation } from "react-i18next";
import { pToRupee, sumMustHavePaise } from "@kothi/shared/types/budget";
import { LanguageToggle } from "../components/LanguageToggle";
import { useBudgetStore } from "./store";

export function Dashboard() {
  const { t } = useTranslation();
  const { state } = useBudgetStore();

  const totalDebtPaise = state.installments.reduce((s, i) => s + i.amountPaise, 0);
  const plannedPaise = state.planning?.plannedAdvancePaise ?? 0;
  const remainingPaise = plannedPaise - totalDebtPaise;
  const usagePct = plannedPaise > 0 ? Math.min(100, (totalDebtPaise / plannedPaise) * 100) : 0;
  const isWarning = usagePct >= 90;

  // Priority goal tracker
  const priorityPaise = state.priorityAdvancePaise;
  const priorityUsedPaise = Math.min(totalDebtPaise, priorityPaise);
  const priorityRemainingPaise = Math.max(0, priorityPaise - priorityUsedPaise);
  const priorityPct = priorityPaise > 0 ? Math.min(100, (priorityUsedPaise / priorityPaise) * 100) : 0;

  const mustHaveCategories = state.priorityCategories.filter((c) => c.classification === "must");

  return (
    <div style={{ minHeight: "100%", paddingBottom: 80 }}>
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>{t("budget.dashboard.title")}</h2>
        <LanguageToggle />
      </div>

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

        {isWarning && (
          <div className="banner animate-fade-up" style={{ borderColor: "#dc2626", background: "color-mix(in srgb, #dc2626 8%, transparent)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span style={{ fontSize: 13, color: "#dc2626" }}>{t("budget.dashboard.warning_90")}</span>
          </div>
        )}

        {/* ── Section 1: Advance Usage ── */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
            Advance Usage
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div className="stat-card">
              <p className="stat-label">{t("budget.dashboard.total_debt")}</p>
              <p className="stat-value" style={{ color: isWarning ? "#dc2626" : undefined }}>
                ₹{pToRupee(totalDebtPaise)}
              </p>
            </div>
            <div className="stat-card">
              <p className="stat-label">{t("budget.dashboard.planned_limit")}</p>
              <p className="stat-value">₹{pToRupee(plannedPaise)}</p>
            </div>
          </div>

          {plannedPaise > 0 && (
            <div className="card" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                  {t("budget.dashboard.remaining")}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: remainingPaise < 0 ? "#dc2626" : "var(--color-accent)" }}>
                  {remainingPaise < 0 ? `₹${pToRupee(Math.abs(remainingPaise))} over` : `₹${pToRupee(remainingPaise)} left`}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${usagePct}%`, background: isWarning ? "#dc2626" : undefined }}
                />
              </div>
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 6, textAlign: "right" }}>
                {usagePct.toFixed(0)}% of ₹{pToRupee(plannedPaise)} used
              </p>
            </div>
          )}
        </div>

        {/* ── Section 2: Priority Goal Tracker ── */}
        {priorityPaise > 0 && (
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
              Priority Goal Tracker
            </p>

            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Priority Budget</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: "var(--color-accent)" }}>₹{pToRupee(priorityPaise)}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Remaining</p>
                  <p style={{ fontSize: 20, fontWeight: 800 }}>₹{pToRupee(priorityRemainingPaise)}</p>
                </div>
              </div>

              <div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${priorityPct}%` }} />
                </div>
                <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, textAlign: "right" }}>
                  {priorityPct.toFixed(0)}% of priority budget used
                </p>
              </div>

              {mustHaveCategories.length > 0 && (
                <div style={{ borderTop: "0.5px solid var(--color-border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {mustHaveCategories.map((cat, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{cat.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {cat.amountPaise > 0 ? `₹${pToRupee(cat.amountPaise)}` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {plannedPaise === 0 && (
          <div className="banner info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ fontSize: 13 }}>
              Complete the budget wizard to see your advance plan here.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

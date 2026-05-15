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

  const priorityPaise = state.priorityAdvancePaise;
  const priorityUsedPaise = Math.min(totalDebtPaise, priorityPaise);
  const priorityRemainingPaise = Math.max(0, priorityPaise - priorityUsedPaise);
  const priorityPct = priorityPaise > 0 ? Math.min(100, (priorityUsedPaise / priorityPaise) * 100) : 0;

  const mustHaveCategories = state.priorityCategories.filter((c) => c.classification === "must");

  return (
    <div style={{ minHeight: "100%", paddingBottom: 80, background: "var(--color-bg)" }}>

      {/* Top bar */}
      <div style={{
        padding: "22px 24px 0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.3px" }}>
            {t("budget.dashboard.title")}
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <LanguageToggle />
      </div>

      <div style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Warning banner */}
        {isWarning && (
          <div className="banner animate-fade-up" style={{
            borderColor: "color-mix(in srgb, var(--color-danger) 30%, transparent)",
            background: "var(--color-danger-bg)",
            color: "var(--color-danger)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{t("budget.dashboard.warning_90")}</span>
          </div>
        )}

        {/* ── Advance Usage ── */}
        <section>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Advance Usage
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div className="stat-card animate-fade-up animate-fade-up-1">
              <p className="stat-label">{t("budget.dashboard.total_debt")}</p>
              <p className="stat-value" style={isWarning ? { color: "var(--color-danger)" } : {}}>
                ₹{pToRupee(totalDebtPaise)}
              </p>
            </div>
            <div className="stat-card animate-fade-up animate-fade-up-2">
              <p className="stat-label">{t("budget.dashboard.planned_limit")}</p>
              <p className="stat-value">₹{pToRupee(plannedPaise)}</p>
            </div>
          </div>

          {plannedPaise > 0 && (
            <div className="card animate-fade-up animate-fade-up-3" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  {t("budget.dashboard.remaining")}
                </span>
                <span style={{
                  fontSize: 20,
                  fontWeight: 800,
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.5px",
                  color: remainingPaise < 0 ? "var(--color-danger)" : "var(--color-accent)",
                }}>
                  {remainingPaise < 0
                    ? `−₹${pToRupee(Math.abs(remainingPaise))}`
                    : `₹${pToRupee(remainingPaise)}`}
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill${isWarning ? " danger" : ""}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 8, textAlign: "right" }}>
                {usagePct.toFixed(0)}% of ₹{pToRupee(plannedPaise)} used
              </p>
            </div>
          )}
        </section>

        {/* ── Priority Goal Tracker ── */}
        {priorityPaise > 0 && (
          <section>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Priority Goal
            </p>

            <div className="card animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Priority Budget
                  </p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: "var(--color-accent)", fontFamily: "var(--font-display)", letterSpacing: "-0.5px" }}>
                    ₹{pToRupee(priorityPaise)}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Remaining
                  </p>
                  <p style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--font-display)", letterSpacing: "-0.5px" }}>
                    ₹{pToRupee(priorityRemainingPaise)}
                  </p>
                </div>
              </div>

              <div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${priorityPct}%` }} />
                </div>
                <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 6, textAlign: "right" }}>
                  {priorityPct.toFixed(0)}% of priority budget used
                </p>
              </div>

              {mustHaveCategories.length > 0 && (
                <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  {mustHaveCategories.map((cat, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>{cat.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
                        {cat.amountPaise > 0 ? `₹${pToRupee(cat.amountPaise)}` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Empty state */}
        {plannedPaise === 0 && (
          <div className="banner info animate-fade-up">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ fontSize: 13 }}>Complete the budget wizard to see your advance plan here.</span>
          </div>
        )}

      </div>
    </div>
  );
}

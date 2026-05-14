import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { pToRupee } from "@kothi/shared/types/budget";
import { useTrackerStore } from "./store";

function getWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
}

export function TrackerDashboard() {
  const { t } = useTranslation();
  const { state, loadFromServer } = useTrackerStore();

  useEffect(() => { void loadFromServer(); }, [loadFromServer]);

  const ob = state.onboarding;
  const totalDebtPaise = ob?.totalAdvancePaise ?? 0;
  const totalWagesPaise = state.records.reduce((s, r) => s + r.wagesEarnedToliPaise, 0);
  const repaidPaise = Math.min(totalWagesPaise, totalDebtPaise);
  const remainingPaise = Math.max(0, totalDebtPaise - repaidPaise);
  const progressPct = totalDebtPaise > 0 ? Math.min(100, (repaidPaise / totalDebtPaise) * 100) : 0;

  const weekStart = getWeekStart();
  const weekRecords = state.records.filter((r) => r.occurredOn >= weekStart && r.dayType === "working_day");
  const weekWagesPaise = weekRecords.reduce((s, r) => s + r.wagesEarnedToliPaise, 0);

  const toliSize = ob ? (ob.toli.fullKoytaMen + ob.toli.fullKoytaWomen + ob.toli.halfKoytaMen + ob.toli.halfKoytaWomen) : 0;

  return (
    <div className="screen" style={{ minHeight: "100dvh" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>
          {t("tracker.dashboard.debt_remaining")}
        </h2>
      </div>

      <div className="screen-body" style={{ gap: 16, paddingTop: 16 }}>
        {/* Main debt card */}
        <div
          style={{
            background: "var(--color-accent)",
            borderRadius: "var(--radius-lg)",
            padding: "24px 20px",
            color: "white",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 13, opacity: 0.85 }}>{t("tracker.dashboard.debt_remaining")}</p>
          <p style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.5px" }}>
            ₹{pToRupee(remainingPaise)}
          </p>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
              <span>{t("tracker.dashboard.repayment_progress")}</span>
              <span>{progressPct.toFixed(0)}%</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.25)", borderRadius: 99 }}>
              <div style={{ height: 6, width: `${progressPct}%`, background: "white", borderRadius: 99, transition: "width 0.6s ease" }} />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="stat-card">
            <p className="stat-label">{t("tracker.dashboard.wages_earned")}</p>
            <p className="stat-value">₹{pToRupee(totalWagesPaise)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">{t("tracker.dashboard.toli_size")}</p>
            <p className="stat-value">{toliSize > 0 ? toliSize : "—"}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">{t("tracker.dashboard.this_week_wages")}</p>
            <p className="stat-value">₹{pToRupee(weekWagesPaise)}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">{t("tracker.dashboard.days_this_week")}</p>
            <p className="stat-value">{weekRecords.length}</p>
          </div>
        </div>

        {/* Recent activity */}
        {state.records.length > 0 && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Recent
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {state.records.slice(0, 5).map((r, i) => (
                <div key={i} className="ledger-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>
                      {r.factoryName || "—"} · {r.occurredOn}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                      {r.dayType.replace("_", " ")}
                    </p>
                  </div>
                  {r.wagesEarnedToliPaise > 0 && (
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-accent)" }}>
                      ₹{pToRupee(r.wagesEarnedToliPaise)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {state.records.length === 0 && !ob && (
          <div className="banner info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ fontSize: 13 }}>
              Go to the Toli tab to set up your tracker for this season.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

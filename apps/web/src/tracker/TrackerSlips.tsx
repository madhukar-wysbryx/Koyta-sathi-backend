import { useState } from "react";
import { useTranslation } from "react-i18next";
import { pToRupee } from "@kothi/shared/types/budget";
import { RATE_PER_TON_PAISE } from "@kothi/shared/types/tracker";
import type { DailyRecord, VehicleType } from "@kothi/shared/types/tracker";
import { useTrackerStore } from "./store";

function WageSlip({ record, vehicleType }: { record: DailyRecord; vehicleType: VehicleType }) {
  const ratePerTon = RATE_PER_TON_PAISE[vehicleType];
  return (
    <div
      style={{
        border: "0.5px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        background: "var(--color-surface)",
      }}
    >
      {/* Header */}
      <div style={{ padding: "16px 18px", background: "var(--color-accent)", color: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: 11, opacity: 0.8, marginBottom: 2 }}>Koyta-Sathi · Wage Slip</p>
            <p style={{ fontSize: 18, fontWeight: 700 }}>{record.occurredOn}</p>
          </div>
          <p style={{ fontSize: 22, fontWeight: 800 }}>₹{pToRupee(record.wagesEarnedToliPaise)}</p>
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { label: "Factory", value: record.factoryName || "—" },
          { label: "Location", value: [record.village, record.district].filter(Boolean).join(", ") || "—" },
          { label: "Day Type", value: record.dayType.replace(/_/g, " ") },
          record.vehiclesFilled ? { label: "Vehicles Filled", value: String(record.vehiclesFilled) } : null,
          { label: "Rate / Ton", value: `₹${pToRupee(ratePerTon)}` },
          record.startTime ? { label: "Hours", value: `${record.startTime} – ${record.endTime ?? "?"}` } : null,
          { label: "Toli Wages", value: `₹${pToRupee(record.wagesEarnedToliPaise)}` },
          record.wagesEarnedKoytaPaise ? { label: "Per Koyta Share", value: `₹${pToRupee(record.wagesEarnedKoytaPaise)}` } : null,
        ]
          .filter(Boolean)
          .map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{(row as { label: string; value: string }).label}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{(row as { label: string; value: string }).value}</span>
            </div>
          ))}
      </div>

      <div style={{ padding: "10px 18px", borderTop: "0.5px solid var(--color-border)", fontSize: 11, color: "var(--color-text-muted)" }}>
        Koyta-Sathi · SOPPECOM × Harvard Research
      </div>
    </div>
  );
}

export function TrackerSlips() {
  const { t } = useTranslation();
  const { state } = useTrackerStore();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const workingDays = state.records.filter((r) => r.dayType === "working_day" && r.wagesEarnedToliPaise > 0);
  const vehicleType = state.onboarding?.vehicle.type ?? "tractor";

  if (workingDays.length === 0) {
    return (
      <div className="screen" style={{ minHeight: "100dvh" }}>
        <div style={{ padding: "20px 20px 0" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Wage Slips</h2>
        </div>
        <div className="screen-body" style={{ justifyContent: "center", alignItems: "center" }}>
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            No wage slips yet. Add working days in the Ledger.
          </p>
        </div>
      </div>
    );
  }

  if (selectedIdx !== null) {
    const record = workingDays[selectedIdx];
    return (
      <div className="screen" style={{ minHeight: "100dvh" }}>
        <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setSelectedIdx(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-primary)", padding: 4 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Wage Slip</h2>
        </div>
        <div className="screen-body" style={{ paddingTop: 16 }}>
          <WageSlip record={record} vehicleType={vehicleType} />
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={{ minHeight: "100dvh" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Wage Slips</h2>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
          {workingDays.length} working {workingDays.length === 1 ? "day" : "days"}
        </p>
      </div>

      <div className="screen-body" style={{ paddingTop: 16, gap: 8 }}>
        {workingDays.map((r, i) => (
          <button
            key={i}
            onClick={() => setSelectedIdx(i)}
            style={{
              width: "100%", textAlign: "left",
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              border: "0.5px solid var(--color-border)",
              background: "var(--color-surface)",
              cursor: "pointer",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 600 }}>{r.occurredOn}</p>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                {r.factoryName || "—"} · {r.vehiclesFilled ?? 0} vehicles
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--color-accent)" }}>
                ₹{pToRupee(r.wagesEarnedToliPaise)}
              </p>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" style={{ marginTop: 4 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

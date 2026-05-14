import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@kothi/shared/lib/api";
import { pToRupee } from "@kothi/shared/types/budget";

interface ReportData {
  avgPlannedAdvancePaise: number;
  avgPriorityAdvancePaise: number;
  avgInstallmentsPerParticipant: number;
  quizAvgScore: number;
  quizAttempts: number;
  villageBreakdown: { village: string; count: number }[];
  purposeBreakdown: { purpose: string; count: number; totalPaise: number }[];
}

export function AdminReports() {
  const { t } = useTranslation();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<ReportData>("/admin/reports")
      .then(setData)
      .catch(() => setError("Failed to load reports."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0" }}>
        <span className="spinner" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="banner" style={{ borderColor: "var(--color-error, #dc2626)", background: "color-mix(in srgb, #dc2626 8%, transparent)" }}>
        <span style={{ color: "#dc2626" }}>{error ?? "No data."}</span>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{t("admin.reports")}</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginBottom: 28 }}>
        Aggregated participant data · 2025-26 Season
      </p>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Avg Planned Advance", value: `₹${pToRupee(data.avgPlannedAdvancePaise)}` },
          { label: "Avg Priority Advance", value: `₹${pToRupee(data.avgPriorityAdvancePaise)}` },
          { label: "Avg Installments / Person", value: data.avgInstallmentsPerParticipant.toFixed(1) },
          { label: "Quiz Avg Score", value: `${data.quizAvgScore.toFixed(1)} / 5` },
          { label: "Quiz Attempts", value: data.quizAttempts },
        ].map((c) => (
          <div key={c.label} className="stat-card">
            <p className="stat-label">{c.label}</p>
            <p className="stat-value">{c.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Village breakdown */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>By Village</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.villageBreakdown.map((v) => (
              <div key={v.village} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 14, color: "var(--color-text-secondary)", minWidth: 100 }}>{v.village}</span>
                <div style={{ flex: 1, height: 8, background: "var(--color-border)", borderRadius: 99 }}>
                  <div
                    style={{
                      height: 8,
                      width: `${Math.min(100, (v.count / Math.max(...data.villageBreakdown.map((x) => x.count))) * 100)}%`,
                      background: "var(--color-accent)",
                      borderRadius: 99,
                    }}
                  />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20 }}>{v.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Purpose breakdown */}
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Installment Purposes</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.purposeBreakdown.sort((a, b) => b.count - a.count).map((p) => (
              <div key={p.purpose} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, textTransform: "capitalize" }}>{p.purpose}</span>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>₹{pToRupee(p.totalPaise)}</p>
                  <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{p.count} entries</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

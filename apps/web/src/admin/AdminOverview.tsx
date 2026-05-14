import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@kothi/shared/lib/api";

interface OverviewStats {
  totalParticipants: number;
  completedWizard: number;
  activeTrackers: number;
  totalInstallmentsLogged: number;
  avgAdvancePaise: number;
}

export function AdminOverview() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<OverviewStats>("/admin/overview")
      .then(setStats)
      .catch(() => setError("Failed to load overview."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 0" }}>
        <span className="spinner" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="banner" style={{ borderColor: "var(--color-error, #dc2626)", background: "color-mix(in srgb, #dc2626 8%, transparent)" }}>
        <span style={{ color: "#dc2626" }}>{error ?? "No data."}</span>
      </div>
    );
  }

  const cards = [
    { label: "Total Participants", value: stats.totalParticipants },
    { label: "Completed Budget Wizard", value: stats.completedWizard },
    { label: "Active Trackers", value: stats.activeTrackers },
    { label: "Installments Logged", value: stats.totalInstallmentsLogged },
    {
      label: "Avg Planned Advance",
      value: stats.avgAdvancePaise > 0 ? `₹${(stats.avgAdvancePaise / 100).toFixed(0)}` : "—",
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{t("admin.overview")}</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginBottom: 28 }}>
        Koyta-Sathi Research Pilot · 2025-26 Season
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {cards.map((c) => (
          <div key={c.label} className="stat-card">
            <p className="stat-label">{c.label}</p>
            <p className="stat-value">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchAuthSession } from "aws-amplify/auth";

type ExportFormat = "json" | "csv";

const API_URL = (globalThis as Record<string, unknown>).__KOTHI_API_URL__ as string | undefined
  ?? import.meta.env.VITE_API_URL
  ?? "http://localhost:3000";

async function fetchExportBlob(format: ExportFormat): Promise<Blob> {
  const session = await fetchAuthSession().catch(() => null);
  const token = session?.tokens?.idToken?.toString();
  const res = await fetch(`${API_URL}/admin/export?format=${format}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res.blob();
}

export function AdminExport() {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    setError(null);
    setSuccess(false);
    try {
      const blob = await fetchExportBlob(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `koyta-sathi-export-${new Date().toISOString().split("T")[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
    } catch {
      setError("Export failed. Check your connection and try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{t("admin.export")}</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginBottom: 28 }}>
        Download all participant data for research analysis.
      </p>

      {error && (
        <div className="banner" style={{ borderColor: "var(--color-error, #dc2626)", background: "color-mix(in srgb, #dc2626 8%, transparent)", marginBottom: 20 }}>
          <span style={{ color: "#dc2626" }}>{error}</span>
        </div>
      )}

      {success && (
        <div className="banner info" style={{ marginBottom: 20 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Export downloaded successfully.</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Full Data Export</h3>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              Includes all participant profiles, budget states, priority categories, installments, daily tracker records, and events. Personally identifiable information is included.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
              disabled={exporting}
              onClick={() => handleExport("json")}
            >
              {exporting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              Export JSON
            </button>

            <button
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: 8 }}
              disabled={exporting}
              onClick={() => handleExport("csv")}
            >
              {exporting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              Export CSV
            </button>
          </div>
        </div>

        <div className="banner info">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: 13 }}>
            Per research consent, all participant data will be permanently deleted from our systems by April 2027. Only authorised researchers should download this data.
          </span>
        </div>
      </div>
    </div>
  );
}

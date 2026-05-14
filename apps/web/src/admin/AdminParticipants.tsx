import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@kothi/shared/lib/api";

interface Participant {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  village?: string;
  wizardCompleted: boolean;
  trackerActive: boolean;
  installmentCount: number;
  createdAt: string;
}

export function AdminParticipants() {
  const { t } = useTranslation();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get<Participant[]>("/admin/participants")
      .then(setParticipants)
      .catch(() => setError("Failed to load participants."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = participants.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.email.toLowerCase().includes(q) ||
      (p.firstName ?? "").toLowerCase().includes(q) ||
      (p.village ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{t("admin.participants")}</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            {participants.length} registered
          </p>
        </div>
        <button className="btn btn-primary">{t("admin.invite")}</button>
      </div>

      <input
        className="input"
        placeholder="Search by name, email, or village…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 20, maxWidth: 360 }}
      />

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
          <span className="spinner" />
        </div>
      )}

      {error && (
        <div className="banner" style={{ borderColor: "var(--color-error, #dc2626)", background: "color-mix(in srgb, #dc2626 8%, transparent)", marginBottom: 16 }}>
          <span style={{ color: "#dc2626" }}>{error}</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>No participants found.</p>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Village</th>
                <th>Wizard</th>
                <th>Tracker</th>
                <th>Installments</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.userId}>
                  <td>{[p.firstName, p.lastName].filter(Boolean).join(" ") || "—"}</td>
                  <td style={{ fontSize: 13 }}>{p.email}</td>
                  <td>{p.village ?? "—"}</td>
                  <td>
                    <span className={`badge ${p.wizardCompleted ? "badge-green" : "badge-gray"}`}>
                      {p.wizardCompleted ? "Done" : "Pending"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${p.trackerActive ? "badge-green" : "badge-gray"}`}>
                      {p.trackerActive ? "Active" : "—"}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>{p.installmentCount}</td>
                  <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {p.createdAt.split("T")[0]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

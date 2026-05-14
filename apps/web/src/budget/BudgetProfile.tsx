import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@kothi/shared";
import { api } from "@kothi/shared/lib/api";
import { LanguageToggle } from "../components/LanguageToggle";

interface ProfileForm {
  firstName: string;
  lastName: string;
  village: string;
}

const VILLAGES = ["Beed", "Latur", "Osmanabad", "Solapur", "Akola", "Amravati"];

export function BudgetProfile() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileForm>({ firstName: "", lastName: "", village: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load existing profile from server
    api.get<{ firstName?: string; lastName?: string; village?: string }>("/me")
      .then((data) => {
        setForm({
          firstName: (data as ProfileForm).firstName ?? "",
          lastName: (data as ProfileForm).lastName ?? "",
          village: (data as ProfileForm).village ?? "",
        });
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/me/profile", form);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";
  const displayName = [form.firstName, form.lastName].filter(Boolean).join(" ") || (user?.email ?? "");

  return (
    <div style={{ minHeight: "100%", paddingBottom: 80 }}>
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Profile</h2>
        <LanguageToggle />
      </div>

      <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "var(--color-accent)", color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-primary)" }}>{displayName}</p>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>{user?.email}</p>
            {form.village && (
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>{form.village}</p>
            )}
          </div>
        </div>

        {saved && (
          <div className="banner info animate-fade-up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontSize: 13 }}>Profile saved.</span>
          </div>
        )}

        {/* Profile fields */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Personal Information</p>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: 13, fontWeight: 600, padding: 0 }}
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">{t("budget.onboarding.first_name")}</label>
                  <input
                    className="input"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    autoComplete="given-name"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">{t("budget.onboarding.last_name")}</label>
                  <input
                    className="input"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">{t("budget.onboarding.village")}</label>
                <select className="select" value={form.village} onChange={(e) => setForm((f) => ({ ...f, village: e.target.value }))}>
                  <option value="">{t("budget.onboarding.village_placeholder")}</option>
                  {VILLAGES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary" style={{ flex: 1 }}
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : t("common.save")}
                </button>
              </div>
            </>
          ) : (
            <>
              {[
                { label: t("budget.onboarding.first_name"), value: form.firstName || "—" },
                { label: t("budget.onboarding.last_name"), value: form.lastName || "—" },
                { label: t("budget.onboarding.village"), value: form.village || "—" },
                { label: "Email", value: user?.email ?? "—" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Research info */}
        <div className="banner info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: 12 }}>
            Your data is used for SOPPECOM × Harvard research and will be deleted by April 2027.
          </span>
        </div>

        {/* Logout */}
        <button
          className="btn btn-secondary btn-full"
          style={{ color: "#dc2626", borderColor: "#dc2626", marginTop: 8 }}
          onClick={() => void logout()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {t("common.logout")}
        </button>
      </div>
    </div>
  );
}

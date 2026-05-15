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
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";
  const displayName = [form.firstName, form.lastName].filter(Boolean).join(" ") || (user?.email ?? "");

  return (
    <div style={{ minHeight: "100%", paddingBottom: 80, background: "var(--color-bg)" }}>

      {/* Header bar */}
      <div style={{ padding: "22px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.3px" }}>Profile</h2>
        <LanguageToggle />
      </div>

      <div style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Avatar hero card */}
        <div className="card animate-fade-up" style={{
          background: "var(--gradient-subtle)",
          padding: "24px 20px",
          display: "flex", alignItems: "center", gap: 18,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "var(--gradient-accent)",
            color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, fontWeight: 800, flexShrink: 0,
            boxShadow: "var(--shadow-accent)",
            fontFamily: "var(--font-display)",
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName}
            </p>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 3 }}>{user?.email}</p>
            {form.village && (
              <span style={{ display: "inline-block", marginTop: 6, fontSize: 12, color: "var(--color-accent)", fontWeight: 600, background: "var(--color-accent-light)", padding: "2px 10px", borderRadius: "var(--radius-pill)" }}>
                📍 {form.village}
              </span>
            )}
          </div>
        </div>

        {/* Saved toast */}
        {saved && (
          <div className="banner info animate-fade-up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Profile saved successfully.</span>
          </div>
        )}

        {/* Personal Information */}
        <div className="card animate-fade-up animate-fade-up-1">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>Personal Information</p>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                style={{ background: "var(--color-accent-light)", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: 13, fontWeight: 700, padding: "6px 14px", borderRadius: "var(--radius-pill)" }}
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">{t("budget.onboarding.first_name")}</label>
                  <input className="input" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} autoComplete="given-name" />
                </div>
                <div className="input-group">
                  <label className="input-label">{t("budget.onboarding.last_name")}</label>
                  <input className="input" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} autoComplete="family-name" />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">{t("budget.onboarding.village")}</label>
                <select className="select" value={form.village} onChange={(e) => setForm((f) => ({ ...f, village: e.target.value }))}>
                  <option value="">{t("budget.onboarding.village_placeholder")}</option>
                  {VILLAGES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" style={{ flex: 2 }} disabled={saving} onClick={handleSave}>
                  {saving ? <span className="spinner" style={{ width: 18, height: 18 }} /> : t("common.save")}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: t("budget.onboarding.first_name"), value: form.firstName || "—" },
                { label: t("budget.onboarding.last_name"), value: form.lastName || "—" },
                { label: t("budget.onboarding.village"), value: form.village || "—" },
                { label: "Email", value: user?.email ?? "—" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Research info */}
        <div className="banner info animate-fade-up animate-fade-up-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: 12 }}>
            Your data is used for SOPPECOM × Harvard research and will be deleted by April 2027.
          </span>
        </div>

        {/* Logout */}
        <button
          className="btn btn-secondary btn-full animate-fade-up animate-fade-up-3"
          style={{ color: "var(--color-danger)", borderColor: "color-mix(in srgb, var(--color-danger) 30%, transparent)", marginTop: 4 }}
          onClick={() => void logout()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

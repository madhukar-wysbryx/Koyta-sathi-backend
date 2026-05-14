import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@kothi/shared";

export function ChangePassword() {
  const { t } = useTranslation();
  const { completePasswordChange, isLoading, error } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    void completePasswordChange(password);
  };

  return (
    <div className="screen" style={{ justifyContent: "center", alignItems: "center" }}>
      <div className="screen-body animate-fade-up">
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <h2>{t("auth.change_password_title")}</h2>
          <p style={{ color: "var(--color-text-muted)", marginTop: 8, fontSize: 14 }}>
            {t("auth.first_login_note")}
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="input-group">
              <label className="input-label">{t("auth.new_password")}</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">{t("auth.confirm_password")}</label>
              <input
                className={`input ${mismatch ? "input-error" : ""}`}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              {mismatch && <span className="error-text">Passwords don't match</span>}
            </div>

            {error && <div className="banner danger">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={isLoading || !password || !confirm}
            >
              {t("auth.change_password_cta")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

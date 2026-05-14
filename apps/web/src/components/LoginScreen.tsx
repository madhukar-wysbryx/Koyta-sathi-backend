import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@kothi/shared";
import { ChangePassword } from "./ChangePassword";
import { LanguageToggle } from "./LanguageToggle";

export function LoginScreen() {
  const { t } = useTranslation();
  const { login, isLoading, error, needsPasswordChange, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  if (needsPasswordChange) return <ChangePassword />;

  return (
    <div
      className="screen"
      style={{ justifyContent: "center", alignItems: "center", minHeight: "100dvh" }}
    >
      {/* Top lang toggle */}
      <div style={{ position: "fixed", top: 16, right: 16 }}>
        <LanguageToggle />
      </div>

      <div className="screen-body animate-fade-up" style={{ justifyContent: "center" }}>
        {/* Brand mark */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "var(--radius-lg)",
              background: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 style={{ fontSize: 26 }}>Koyta-Sathi</h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: 6, fontSize: 15 }}>
            {t("auth.login")}
          </p>
        </div>

        {/* Form */}
        <div className="card animate-fade-up animate-fade-up-2" style={{ marginTop: 8 }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void login(email, password);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <div className="input-group">
              <label className="input-label" htmlFor="email">
                {t("auth.email")}
              </label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                inputMode="email"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password">
                {t("auth.password")}
              </label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="banner danger animate-fade-up">
                {t("auth.login_error")}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={isLoading || !email || !password}
              style={{ marginTop: 4 }}
            >
              {isLoading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  {t("common.loading")}
                </span>
              ) : (
                t("auth.login_cta")
              )}
            </button>
          </form>
        </div>

        {import.meta.env.VITE_COGNITO_USER_POOL_ID === "placeholder" ||
          !import.meta.env.VITE_COGNITO_USER_POOL_ID ? (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              background: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
              border: "0.5px dashed var(--color-accent)",
              fontSize: 12,
              color: "var(--color-text-secondary)",
              lineHeight: 1.7,
            }}
          >
            <strong style={{ color: "var(--color-accent)" }}>Dev mode</strong> — use any email + any password.
            <br />
            Use <code>admin@...</code> email for the admin shell.
          </div>
        ) : null}

        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--color-text-muted)",
            marginTop: 12,
          }}
        >
          Koyta-Sathi · SOPPECOM × Harvard Research
        </p>
      </div>
    </div>
  );
}

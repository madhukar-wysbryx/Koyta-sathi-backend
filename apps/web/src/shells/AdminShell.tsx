import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@kothi/shared";
import { LoginScreen } from "../components/LoginScreen";
import { AdminOverview } from "../admin/AdminOverview";
import { AdminParticipants } from "../admin/AdminParticipants";
import { AdminReports } from "../admin/AdminReports";
import { AdminExport } from "../admin/AdminExport";

type AdminTab = "overview" | "participants" | "reports" | "export";

export function AdminShell() {
  const { user, isLoading, hydrate, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const { t } = useTranslation();

  useEffect(() => { void hydrate(); }, [hydrate]);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
        <span className="spinner" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  if (user.role !== "admin") {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <h2>Access Denied</h2>
        <p style={{ color: "var(--color-text-muted)" }}>You don't have access to the admin panel.</p>
        <button className="btn btn-secondary" onClick={() => void logout()}>
          {t("common.logout")}
        </button>
      </div>
    );
  }

  const initials = user.email.slice(0, 2).toUpperCase();

  const NAV_ITEMS: { id: AdminTab; label: string }[] = [
    { id: "overview", label: t("admin.overview") },
    { id: "participants", label: t("admin.participants") },
    { id: "reports", label: t("admin.reports") },
    { id: "export", label: t("admin.export") },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "overview": return <AdminOverview />;
      case "participants": return <AdminParticipants />;
      case "reports": return <AdminReports />;
      case "export": return <AdminExport />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          Koyta-<span>Sathi</span>
          <div style={{ fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 400, color: "var(--color-text-muted)", marginTop: 2 }}>
            Admin
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Admin</div>
          </div>
          <button
            className="btn-ghost"
            style={{ padding: 6, minHeight: "auto", background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
            onClick={() => void logout()}
            title="Logout"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="sidebar-main-content" style={{ padding: "32px 32px" }}>
        {renderContent()}
      </main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`bn-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
              style={{ fontSize: 11 }}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

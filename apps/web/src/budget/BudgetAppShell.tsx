import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@kothi/shared";
import { Dashboard } from "./Dashboard";
import { BudgetLedger } from "./BudgetLedger";
import { BudgetProfile } from "./BudgetProfile";

type Tab = "dashboard" | "ledger" | "profile";

const NAV_ITEMS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "ledger",
    label: "Ledger",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function BudgetAppShell() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [active, setActive] = useState<Tab>("dashboard");

  const renderTab = () => {
    switch (active) {
      case "dashboard": return <Dashboard />;
      case "ledger":    return <BudgetLedger />;
      case "profile":   return <BudgetProfile />;
    }
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <div className="app-layout">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          Koyta-<span>Sathi</span>
          <div style={{ fontSize: 11, fontFamily: "var(--font-body)", fontWeight: 400, color: "var(--color-text-muted)", marginTop: 2 }}>
            Budget
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${active === item.id ? "active" : ""}`}
              onClick={() => setActive(item.id)}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email ?? ""}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Participant</div>
          </div>
          <button
            style={{ padding: 6, minHeight: "auto", background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
            onClick={() => void logout()}
            title={t("common.logout")}
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
      <main className="sidebar-main-content" style={{ overflowY: "auto" }}>
        {renderTab()}
      </main>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`bn-item ${active === item.id ? "active" : ""}`}
              onClick={() => setActive(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

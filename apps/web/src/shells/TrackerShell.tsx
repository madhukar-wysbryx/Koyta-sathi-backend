import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@kothi/shared";
import { LoginScreen } from "../components/LoginScreen";
import { TrackerDashboard } from "../tracker/TrackerDashboard";
import { TrackerLedger } from "../tracker/TrackerLedger";
import { TrackerSlips } from "../tracker/TrackerSlips";
import { TrackerToli } from "../tracker/TrackerToli";

type Tab = "home" | "ledger" | "slips" | "toli";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "home",
    label: "Home",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: "ledger",
    label: "Ledger",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: "slips",
    label: "Slips",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    id: "toli",
    label: "Toli",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export function TrackerShell() {
  const { user, isLoading, hydrate } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("home");
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

  const renderTab = () => {
    switch (activeTab) {
      case "home": return <TrackerDashboard />;
      case "ledger": return <TrackerLedger />;
      case "slips": return <TrackerSlips />;
      case "toli": return <TrackerToli />;
    }
  };

  return (
    <div className="app-layout" style={{ flexDirection: "column" }}>
      <div className="mobile-main-content" style={{ flex: 1 }}>
        {renderTab()}
      </div>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`bn-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{t(`tracker.nav.${tab.id}`, tab.label)}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

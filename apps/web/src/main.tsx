import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { configureAmplify, events } from "@kothi/shared";
import { initI18n } from "@kothi/shared/i18n";
import "./index.css";

configureAmplify();
initI18n();

const hostname = window.location.hostname;
const shellParam = new URLSearchParams(window.location.search).get("shell");

async function bootstrap() {
  let Shell: React.ComponentType;

  if (
    hostname === "tracker.wysbryxapp.com" ||
    hostname === "dev.tracker.wysbryxapp.com" ||
    (hostname === "localhost" && shellParam === "tracker")
  ) {
    events.init("tracker");
    document.documentElement.setAttribute("data-shell", "tracker");
    document.title = "Koyta-Sathi — Tracker";
    const { TrackerShell } = await import("./shells/TrackerShell");
    Shell = TrackerShell;
  } else if (
    hostname === "admin.wysbryxapp.com" ||
    hostname === "dev.admin.wysbryxapp.com" ||
    (hostname === "localhost" && shellParam === "admin")
  ) {
    events.init("admin");
    document.documentElement.setAttribute("data-shell", "admin");
    document.title = "Koyta-Sathi — Admin";
    const { AdminShell } = await import("./shells/AdminShell");
    Shell = AdminShell;
  } else {
    events.init("budget");
    document.documentElement.setAttribute("data-shell", "budget");
    document.title = "Koyta-Sathi — Budget";
    const { BudgetShell } = await import("./shells/BudgetShell");
    Shell = BudgetShell;
  }

  events.track("app_opened", { subdomain: document.documentElement.dataset.shell });

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <Shell />
    </StrictMode>
  );
}

void bootstrap();

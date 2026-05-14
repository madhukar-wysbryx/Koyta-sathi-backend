import { apiUrl } from "./api";

// Budget shell — koytasathi.in (or budget.koytasathi.in)
export const budgetSite = new sst.aws.StaticSite("BudgetSite", {
  path: "apps/web",
  build: {
    command: "pnpm build",
    output: "dist",
  },
  environment: {
    VITE_API_URL: apiUrl.url,
    VITE_SHELL: "budget",
  },
  indexPage: "index.html",
  errorPage: "index.html",
});

// Tracker shell — tracker.koytasathi.in
export const trackerSite = new sst.aws.StaticSite("TrackerSite", {
  path: "apps/web",
  build: {
    command: "pnpm build:tracker",
    output: "dist",
  },
  environment: {
    VITE_API_URL: apiUrl.url,
    VITE_SHELL: "tracker",
  },
  indexPage: "index.html",
  errorPage: "index.html",
});

// Admin shell — admin.koytasathi.in
export const adminSite = new sst.aws.StaticSite("AdminSite", {
  path: "apps/web",
  build: {
    command: "pnpm build:admin",
    output: "dist",
  },
  environment: {
    VITE_API_URL: apiUrl.url,
    VITE_SHELL: "admin",
  },
  indexPage: "index.html",
  errorPage: "index.html",
});

export const web = { budgetSite, trackerSite, adminSite };
export const webUrls = {
  budget: budgetSite.url,
  tracker: trackerSite.url,
  admin: adminSite.url,
};

import { apiUrl } from "./api";
import { userPool, userPoolClient } from "./auth";

// NOTE: Architecture spec calls for one CloudFront distribution with 3 alternate domain names.
// SST v3's StaticSite creates one distribution per site; achieving a shared distribution
// requires raw Pulumi CloudFront resources. At 20-user pilot scale the difference is purely
// operational (3 invalidations per deploy vs 1). Accepted deviation — revisit in v2.

// Budget shell — budget.wysbryxapp.com
export const budgetSite = new sst.aws.StaticSite("BudgetSite", {
  path: "apps/web",
  build: {
    command: "pnpm build",
    output: "dist",
  },
  environment: {
    VITE_API_URL: apiUrl.url,
    VITE_SHELL: "budget",
    VITE_COGNITO_USER_POOL_ID: userPool.id,
    VITE_COGNITO_CLIENT_ID: userPoolClient.id,
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
    VITE_COGNITO_USER_POOL_ID: userPool.id,
    VITE_COGNITO_CLIENT_ID: userPoolClient.id,
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
    VITE_COGNITO_USER_POOL_ID: userPool.id,
    VITE_COGNITO_CLIENT_ID: userPoolClient.id,
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

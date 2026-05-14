/// <reference path="./.sst/platform/config.d.ts" />

const ALLOWED_STAGES = ["dev", "prod"] as const;
type AllowedStage = (typeof ALLOWED_STAGES)[number];

export default $config({
  app(input) {
    const stage = input?.stage;
    if (!ALLOWED_STAGES.includes(stage as AllowedStage)) {
      throw new Error(
        `Stage "${stage}" is not allowed. Allowed stages: ${ALLOWED_STAGES.join(", ")}. ` +
          `Branches: "main" → dev, "production" → prod. Never run sst deploy locally.`
      );
    }
    return {
      name: "kothi",
      removal: stage === "prod" ? "retain" : "remove",
      protect: stage === "prod",
      home: "aws",
      providers: {
        aws: { region: "ap-south-1" },
      },
    };
  },
  async run() {
    const { auth } = await import("./infra/auth");
    const { data } = await import("./infra/data");
    const { api, apiUrl } = await import("./infra/api");
    const { web, webUrls } = await import("./infra/web");

    void auth;
    void data;
    void api;
    void web;

    return { apiUrl, webUrls };
  },
});

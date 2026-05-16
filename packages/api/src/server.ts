import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { errorHandler } from "./middleware/error.js";
import { meRouter } from "./routes/me.js";
import { budgetRouter } from "./routes/budget.js";
import { trackerRouter } from "./routes/tracker.js";
import { dailyRecordsRouter } from "./routes/daily-records.js";
import { slipsRouter } from "./routes/slips.js";
import { eventsRouter } from "./routes/events.js";
import { adminRouter } from "./routes/admin.js";

const app = new Hono();

app.use("*", logger());
app.onError(errorHandler);

app.get("/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

app.route("/me", meRouter);
app.route("/budget-state", budgetRouter);
app.route("/tracker-onboarding", trackerRouter);
app.route("/daily-records", dailyRecordsRouter);
app.route("/slips", slipsRouter);
app.route("/events", eventsRouter);
app.route("/admin", adminRouter);

const port = Number(process.env.PORT ?? 3001);
console.log(`API running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });

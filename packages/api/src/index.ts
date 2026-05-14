import { handle } from "hono/aws-lambda";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { errorHandler } from "./middleware/error.js";
import { meRouter } from "./routes/me.js";
import { budgetRouter } from "./routes/budget.js";
import { trackerRouter } from "./routes/tracker.js";
import { eventsRouter } from "./routes/events.js";
import { adminRouter } from "./routes/admin.js";

const app = new Hono();

app.use("*", logger());
app.onError(errorHandler);

app.get("/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

app.route("/me", meRouter);
app.route("/budget-state", budgetRouter);
app.route("/tracker-state", trackerRouter);
app.route("/events", eventsRouter);
app.route("/admin", adminRouter);

export const handler = handle(app);

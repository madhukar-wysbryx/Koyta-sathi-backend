import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { Hono } from "hono";
import { ulid } from "ulid";
import { ddb, tableNames } from "../lib/dynamo.js";
import { requireAuth } from "../middleware/auth.js";

export const eventsRouter = new Hono();

eventsRouter.use("*", requireAuth);

eventsRouter.post("/", async (c) => {
  const { userId } = c.get("auth");
  const { events } = await c.req.json<{ events: unknown[] }>();
  const receivedAt = new Date().toISOString();

  await Promise.all(
    (events ?? []).map((event) =>
      ddb.send(
        new PutCommand({
          TableName: tableNames.events,
          Item: { userId, eventId: ulid(), receivedAt, ...(event as object) },
        })
      )
    )
  );

  return c.json({ ok: true });
});

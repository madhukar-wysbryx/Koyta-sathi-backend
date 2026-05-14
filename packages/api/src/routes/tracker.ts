import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Hono } from "hono";
import { ddb, tableNames } from "../lib/dynamo.js";
import { requireAuth } from "../middleware/auth.js";

export const trackerRouter = new Hono();

trackerRouter.use("*", requireAuth);

trackerRouter.get("/", async (c) => {
  const { userId } = c.get("auth");
  const result = await ddb.send(
    new GetCommand({ TableName: tableNames.trackerState, Key: { userId } })
  );
  return c.json(result.Item ?? null);
});

trackerRouter.put("/", async (c) => {
  const { userId } = c.get("auth");
  const body = await c.req.json();
  const item = { ...body, userId, updatedAt: new Date().toISOString() };
  await ddb.send(new PutCommand({ TableName: tableNames.trackerState, Item: item }));
  return c.json(item);
});

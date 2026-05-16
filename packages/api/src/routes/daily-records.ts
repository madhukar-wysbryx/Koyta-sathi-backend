import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Hono } from "hono";
import { ddb, tableNames } from "../lib/dynamo.js";
import { requireAuth } from "../middleware/auth.js";

export const dailyRecordsRouter = new Hono();
dailyRecordsRouter.use("*", requireAuth);

dailyRecordsRouter.get("/", async (c) => {
  const { userId } = c.get("auth");
  const result = await ddb.send(
    new QueryCommand({
      TableName: tableNames.dailyRecords,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
      ScanIndexForward: false, // newest first
    }),
  );
  const records = result.Items ?? [];

  const workingDays = records.filter((r) => r.dayType === "working_day");
  const totalWagesPaise = workingDays.reduce((s, r) => s + ((r.wagesEarnedKoytaPaise as number) ?? 0), 0);
  const totalTons = workingDays.reduce(
    (s, r) => s + ((r.vehiclesFilled as number) ?? 0) * ((r.tonsPerVehicle as number) ?? 0),
    0,
  );

  return c.json({
    records,
    aggregates: { totalWagesPaise, daysWorked: workingDays.length, totalTons },
  });
});

// Idempotent upsert — same userId+occurredOn overwrites cleanly
dailyRecordsRouter.post("/", async (c) => {
  const { userId } = c.get("auth");
  const body = await c.req.json();
  const { occurredOn } = body as { occurredOn?: string };
  if (!occurredOn) return c.json({ error: "occurredOn required" }, 400);
  const item = { ...body, userId, loggedAt: new Date().toISOString() };
  await ddb.send(new PutCommand({ TableName: tableNames.dailyRecords, Item: item }));
  return c.json(item, 201);
});

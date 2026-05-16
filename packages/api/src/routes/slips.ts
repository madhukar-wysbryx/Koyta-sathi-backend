import { GetCommand, PutCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { Hono } from "hono";
import { monotonicFactory } from "ulid";
import { ddb, tableNames } from "../lib/dynamo.js";
import { requireAuth } from "../middleware/auth.js";
import { getUploadUrl, getDisplayUrl, deleteObject } from "../lib/s3.js";

const ulid = monotonicFactory();

export const slipsRouter = new Hono();
slipsRouter.use("*", requireAuth);

slipsRouter.get("/", async (c) => {
  const { userId } = c.get("auth");
  const result = await ddb.send(
    new QueryCommand({
      TableName: tableNames.slips,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
      ScanIndexForward: false, // newest first
    }),
  );
  const slips = await Promise.all(
    (result.Items ?? []).map(async (slip) => ({
      ...slip,
      displayUrl: await getDisplayUrl(slip.s3Key as string),
    })),
  );
  return c.json(slips);
});

// Returns a pre-signed S3 PUT URL (5-min TTL) and pre-creates the metadata row
slipsRouter.post("/upload-url", async (c) => {
  const { userId } = c.get("auth");
  const slipId = ulid();
  const s3Key = `slips/${userId}/${slipId}.jpg`;
  const uploadUrl = await getUploadUrl(s3Key);
  await ddb.send(
    new PutCommand({
      TableName: tableNames.slips,
      Item: { userId, slipId, s3Key, capturedAt: new Date().toISOString() },
    }),
  );
  return c.json({ slipId, uploadUrl, s3Key }, 201);
});

// Update optional metadata after the photo has been uploaded
slipsRouter.put("/:slipId", async (c) => {
  const { userId } = c.get("auth");
  const { slipId } = c.req.param();
  const { voucherDate, factoryName, voucherAmountPaise } = await c.req.json();
  const existing = await ddb.send(
    new GetCommand({ TableName: tableNames.slips, Key: { userId, slipId } }),
  );
  if (!existing.Item) return c.json({ error: "Not found" }, 404);
  const updated = { ...existing.Item, voucherDate, factoryName, voucherAmountPaise };
  await ddb.send(new PutCommand({ TableName: tableNames.slips, Item: updated }));
  return c.json(updated);
});

slipsRouter.delete("/:slipId", async (c) => {
  const { userId } = c.get("auth");
  const { slipId } = c.req.param();
  const existing = await ddb.send(
    new GetCommand({ TableName: tableNames.slips, Key: { userId, slipId } }),
  );
  if (!existing.Item) return c.json({ error: "Not found" }, 404);
  await deleteObject(existing.Item.s3Key as string);
  await ddb.send(new DeleteCommand({ TableName: tableNames.slips, Key: { userId, slipId } }));
  return c.json({ ok: true });
});

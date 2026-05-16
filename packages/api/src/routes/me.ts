import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Hono } from "hono";
import { ddb, tableNames } from "../lib/dynamo.js";
import { requireAuth } from "../middleware/auth.js";

export const meRouter = new Hono();

meRouter.use("*", requireAuth);

meRouter.get("/", async (c) => {
  const { userId, email, role } = c.get("auth");
  const now = new Date().toISOString();

  // Upsert — sets fields only on first call, always updates lastSeenAt
  await ddb.send(
    new UpdateCommand({
      TableName: tableNames.users,
      Key: { userId },
      UpdateExpression:
        "SET email = if_not_exists(email, :email), " +
        "createdAt = if_not_exists(createdAt, :now), " +
        "#role = if_not_exists(#role, :role), " +
        "lastSeenAt = :now",
      ExpressionAttributeNames: { "#role": "role" },
      ExpressionAttributeValues: { ":email": email, ":now": now, ":role": role },
    }),
  );

  // Return full profile from DynamoDB so client gets firstName, lastName, village etc.
  const result = await ddb.send(new GetCommand({ TableName: tableNames.users, Key: { userId } }));
  return c.json(result.Item ?? { userId, email, role });
});

meRouter.put("/profile", async (c) => {
  const { userId } = c.get("auth");
  const { firstName, lastName, village } = await c.req.json<{
    firstName?: string;
    lastName?: string;
    village?: string;
  }>();

  await ddb.send(
    new UpdateCommand({
      TableName: tableNames.users,
      Key: { userId },
      UpdateExpression: "SET firstName = :fn, lastName = :ln, village = :v, profileUpdatedAt = :now",
      ExpressionAttributeValues: {
        ":fn": firstName ?? "",
        ":ln": lastName ?? "",
        ":v": village ?? "",
        ":now": new Date().toISOString(),
      },
    }),
  );

  return c.json({ ok: true });
});

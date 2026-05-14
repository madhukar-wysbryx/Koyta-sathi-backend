import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Hono } from "hono";
import { ddb, tableNames } from "../lib/dynamo.js";
import { requireAuth } from "../middleware/auth.js";

export const meRouter = new Hono();

meRouter.use("*", requireAuth);

meRouter.get("/", async (c) => {
  const { userId, email, role } = c.get("auth");
  const now = new Date().toISOString();

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
    })
  );

  return c.json({ userId, email, role });
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
    })
  );

  return c.json({ ok: true });
});

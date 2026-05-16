import type { ScanCommandInput } from "@aws-sdk/lib-dynamodb";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "./dynamo.js";

// Paginates through a full DynamoDB table scan — fine at 20-user pilot scale
export async function scanAll<T = Record<string, unknown>>(
  tableName: string,
  projection?: string,
): Promise<T[]> {
  const items: T[] = [];
  const params: ScanCommandInput = { TableName: tableName };
  if (projection) params.ProjectionExpression = projection;
  let lastKey: Record<string, unknown> | undefined;
  do {
    if (lastKey) params.ExclusiveStartKey = lastKey;
    const res = await ddb.send(new ScanCommand(params));
    items.push(...((res.Items ?? []) as T[]));
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return items;
}

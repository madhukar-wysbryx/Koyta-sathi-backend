import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Table names are injected by SST as env vars (see infra/api.ts)
// Fallback to stage-prefixed names for local dev
const stage = process.env.STAGE ?? "dev";

export const tableNames = {
  users: process.env.USERS_TABLE ?? `kothi-${stage}-users`,
  budgetState: process.env.BUDGET_STATE_TABLE ?? `kothi-${stage}-budget_state`,
  trackerState: process.env.TRACKER_STATE_TABLE ?? `kothi-${stage}-tracker_state`,
  events: process.env.EVENTS_TABLE ?? `kothi-${stage}-events`,
};

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

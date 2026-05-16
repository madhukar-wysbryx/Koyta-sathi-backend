import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Table names are injected by SST as env vars (see infra/api.ts)
// Fallback to stage-prefixed names for local dev
const stage = process.env.STAGE ?? "dev";

export const tableNames = {
  users: process.env.USERS_TABLE ?? `kothi-${stage}-users`,
  budgetState: process.env.BUDGET_STATE_TABLE ?? `kothi-${stage}-budget_state`,
  trackerOnboarding: process.env.TRACKER_ONBOARDING_TABLE ?? `kothi-${stage}-tracker_onboarding`,
  dailyRecords: process.env.DAILY_RECORDS_TABLE ?? `kothi-${stage}-daily_records`,
  slips: process.env.SLIPS_TABLE ?? `kothi-${stage}-slips`,
  events: process.env.EVENTS_TABLE ?? `kothi-${stage}-events`,
};

const clientConfig = process.env.DYNAMODB_ENDPOINT
  ? {
      region: process.env.AWS_REGION ?? "ap-south-1",
      endpoint: process.env.DYNAMODB_ENDPOINT,
      credentials: { accessKeyId: "local", secretAccessKey: "local" },
    }
  : { region: process.env.AWS_REGION ?? "ap-south-1" };

const client = new DynamoDBClient(clientConfig);
export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

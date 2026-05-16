// All DynamoDB tables — PAY_PER_REQUEST, no provisioned capacity, no GSIs
// userId is the primary hash key for all user-scoped tables

export const usersTable = new sst.aws.Dynamo("UsersTable", {
  fields: { userId: "string" },
  primaryIndex: { hashKey: "userId" },
});

export const budgetStateTable = new sst.aws.Dynamo("BudgetStateTable", {
  fields: { userId: "string" },
  primaryIndex: { hashKey: "userId" },
});

// One JSON blob per user — toli, vehicle, advance details
export const trackerOnboardingTable = new sst.aws.Dynamo("TrackerOnboardingTable", {
  fields: { userId: "string" },
  primaryIndex: { hashKey: "userId" },
});

// One item per user per day; occurredOn is the idempotency key
export const dailyRecordsTable = new sst.aws.Dynamo("DailyRecordsTable", {
  fields: { userId: "string", occurredOn: "string" },
  primaryIndex: { hashKey: "userId", rangeKey: "occurredOn" },
});

// Slip metadata only; photos live in S3
export const slipsTable = new sst.aws.Dynamo("SlipsTable", {
  fields: { userId: "string", slipId: "string" },
  primaryIndex: { hashKey: "userId", rangeKey: "slipId" },
});

// Events: userId partition, ULID sort key for chronological reads
export const eventsTable = new sst.aws.Dynamo("EventsTable", {
  fields: { userId: "string", eventId: "string" },
  primaryIndex: { hashKey: "userId", rangeKey: "eventId" },
});

// Slip photos — BlockPublicAccess enforced by SST default, pre-signed URLs for access
export const slipsBucket = new sst.aws.Bucket("SlipsBucket");

export const data = {
  usersTable,
  budgetStateTable,
  trackerOnboardingTable,
  dailyRecordsTable,
  slipsTable,
  eventsTable,
  slipsBucket,
};

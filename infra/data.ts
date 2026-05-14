// All DynamoDB tables — PAY_PER_REQUEST, no provisioned capacity, no GSIs
// userId is the primary hash key for user-scoped tables

export const usersTable = new sst.aws.Dynamo("UsersTable", {
  fields: { userId: "string" },
  primaryIndex: { hashKey: "userId" },
});

export const budgetStateTable = new sst.aws.Dynamo("BudgetStateTable", {
  fields: { userId: "string" },
  primaryIndex: { hashKey: "userId" },
});

// Tracker state stored as a single JSON blob per user (matching budget pattern)
export const trackerStateTable = new sst.aws.Dynamo("TrackerStateTable", {
  fields: { userId: "string" },
  primaryIndex: { hashKey: "userId" },
});

// Events: userId partition, ULID sort key for ordered reads
export const eventsTable = new sst.aws.Dynamo("EventsTable", {
  fields: { userId: "string", eventId: "string" },
  primaryIndex: { hashKey: "userId", rangeKey: "eventId" },
});

export const data = { usersTable, budgetStateTable, trackerStateTable, eventsTable };

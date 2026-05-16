import {
  CreateTableCommand,
  DynamoDBClient,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: "ap-south-1",
  endpoint: "http://localhost:8000",
  credentials: { accessKeyId: "local", secretAccessKey: "local" },
});

const stage = process.env.STAGE ?? "dev";

const tables = [
  {
    TableName: `kothi-${stage}-users`,
    KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "userId", AttributeType: "S" }],
  },
  {
    TableName: `kothi-${stage}-budget_state`,
    KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "userId", AttributeType: "S" }],
  },
  {
    TableName: `kothi-${stage}-tracker_onboarding`,
    KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "userId", AttributeType: "S" }],
  },
  {
    TableName: `kothi-${stage}-daily_records`,
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "occurredOn", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "occurredOn", AttributeType: "S" },
    ],
  },
  {
    TableName: `kothi-${stage}-slips`,
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "slipId", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "slipId", AttributeType: "S" },
    ],
  },
  {
    TableName: `kothi-${stage}-events`,
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "eventId", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "eventId", AttributeType: "S" },
    ],
  },
];

const { TableNames: existing = [] } = await client.send(new ListTablesCommand({}));

for (const table of tables) {
  if (existing.includes(table.TableName)) {
    console.log(`  skip  ${table.TableName} (already exists)`);
    continue;
  }
  await client.send(
    new CreateTableCommand({
      ...table,
      BillingMode: "PAY_PER_REQUEST",
    })
  );
  console.log(`created  ${table.TableName}`);
}

console.log("Done.");

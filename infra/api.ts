import { userPool, userPoolClient } from "./auth";
import { usersTable, budgetStateTable, trackerStateTable, eventsTable } from "./data";

export const apiFunction = new sst.aws.Function("ApiFunction", {
  handler: "packages/api/src/index.handler",
  runtime: "nodejs22.x",
  memory: "256 MB",
  timeout: "30 seconds",
  environment: {
    STAGE: $app.stage,
    USER_POOL_ID: userPool.id,
    USER_POOL_CLIENT_ID: userPoolClient.id,
    USERS_TABLE: usersTable.name,
    BUDGET_STATE_TABLE: budgetStateTable.name,
    TRACKER_STATE_TABLE: trackerStateTable.name,
    EVENTS_TABLE: eventsTable.name,
  },
  permissions: [
    { actions: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query"], resources: [usersTable.arn] },
    { actions: ["dynamodb:GetItem", "dynamodb:PutItem"], resources: [budgetStateTable.arn] },
    { actions: ["dynamodb:GetItem", "dynamodb:PutItem"], resources: [trackerStateTable.arn] },
    { actions: ["dynamodb:PutItem", "dynamodb:Query", "dynamodb:Scan"], resources: [eventsTable.arn] },
    { actions: ["cognito-idp:AdminCreateUser", "cognito-idp:AdminSetUserPassword", "cognito-idp:ListUsers"], resources: [userPool.arn] },
  ],
});

export const apiUrl = new sst.aws.ApiGatewayV2("Api", {
  cors: {
    allowOrigins: ["*"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  },
}).routeAll(apiFunction);

export const api = { apiFunction, apiUrl };

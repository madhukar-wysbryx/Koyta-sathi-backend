import { userPool, userPoolClient } from "./auth";
import {
  usersTable,
  budgetStateTable,
  trackerOnboardingTable,
  dailyRecordsTable,
  slipsTable,
  eventsTable,
  slipsBucket,
} from "./data";

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
    TRACKER_ONBOARDING_TABLE: trackerOnboardingTable.name,
    DAILY_RECORDS_TABLE: dailyRecordsTable.name,
    SLIPS_TABLE: slipsTable.name,
    EVENTS_TABLE: eventsTable.name,
    SLIPS_BUCKET: slipsBucket.name,
  },
  permissions: [
    {
      actions: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query", "dynamodb:Scan"],
      resources: [usersTable.arn],
    },
    { actions: ["dynamodb:GetItem", "dynamodb:PutItem"], resources: [budgetStateTable.arn] },
    { actions: ["dynamodb:GetItem", "dynamodb:PutItem"], resources: [trackerOnboardingTable.arn] },
    {
      actions: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query", "dynamodb:DeleteItem"],
      resources: [dailyRecordsTable.arn],
    },
    {
      actions: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Query", "dynamodb:DeleteItem"],
      resources: [slipsTable.arn],
    },
    { actions: ["dynamodb:PutItem", "dynamodb:Query", "dynamodb:Scan"], resources: [eventsTable.arn] },
    // S3 for slip photos (individual object operations)
    { actions: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"], resources: [$interpolate`${slipsBucket.arn}/*`] },
    // S3 ListBucket needed for bulk-delete on user removal
    { actions: ["s3:ListBucket"], resources: [slipsBucket.arn] },
    // Cognito admin operations for user management
    {
      actions: [
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminDeleteUser",
        "cognito-idp:AdminGetUser",
        "cognito-idp:ListUsers",
      ],
      resources: [userPool.arn],
    },
    // Secrets Manager for participant credential slips
    {
      actions: [
        "secretsmanager:GetSecretValue",
        "secretsmanager:CreateSecret",
        "secretsmanager:PutSecretValue",
        "secretsmanager:DeleteSecret",
      ],
      resources: [$interpolate`arn:aws:secretsmanager:ap-south-1:*:secret:kothi/${$app.stage}/*`],
    },
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

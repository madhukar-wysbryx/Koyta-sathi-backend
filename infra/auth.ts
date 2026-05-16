// Cognito User Pool — admin-created users only, no self-signup
// MessageAction=SUPPRESS so participant invites don't send AWS default emails
export const userPool = new sst.aws.CognitoUserPool("UserPool", {
  usernames: ["email"],
  password: {
    minLength: 8,
    requireNumbers: true,
    requireSymbols: false,
    requireUppercase: true,
    requireLowercase: true,
  },
  transform: {
    userPool: (args) => {
      // custom:role is read by Hono auth middleware to gate admin routes
      args.schemas = [
        {
          name: "role",
          attributeDataType: "String",
          mutable: true,
          stringAttributeConstraints: { minLength: "1", maxLength: "50" },
        },
      ];
    },
  },
});

export const userPoolClient = userPool.addClient("UserPoolClient", {
  authFlows: {
    userPassword: true,
    userSrp: true,
    adminUserPassword: true,
  },
  tokenValidity: {
    accessToken: { value: 8, unit: "hours" },
    idToken: { value: 8, unit: "hours" },
    refreshToken: { value: 30, unit: "days" },
  },
});

export const auth = { userPool, userPoolClient };

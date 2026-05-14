// Cognito User Pool — admin-created users only, no self-signup
// MessageAction=SUPPRESS so participant invites don't send AWS default emails
export const userPool = new sst.aws.CognitoUserPool("UserPool", {
  usernames: ["email"],
  password: {
    minLength: 8,
    requireNumbers: false,
    requireSymbols: false,
    requireUppercase: false,
    requireLowercase: false,
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

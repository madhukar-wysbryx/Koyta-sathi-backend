import { Amplify } from "aws-amplify";

export function configureAmplify() {
  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
  const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;

  if (!userPoolId || !clientId) {
    console.warn(
      "[amplify] VITE_COGNITO_USER_POOL_ID or VITE_COGNITO_CLIENT_ID missing — auth will not work"
    );
    return;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId: clientId,
        signUpVerificationMethod: "code",
        loginWith: { email: true },
      },
    },
  });
}

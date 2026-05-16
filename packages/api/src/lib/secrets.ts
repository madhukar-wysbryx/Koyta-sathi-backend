import {
  SecretsManagerClient,
  GetSecretValueCommand,
  CreateSecretCommand,
  PutSecretValueCommand,
  DeleteSecretCommand,
} from "@aws-sdk/client-secrets-manager";

const sm = new SecretsManagerClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
const stage = process.env.STAGE ?? "dev";

function credentialPath(participantId: string): string {
  return `kothi/${stage}/credentials/${participantId}`;
}

export async function getCredential(participantId: string): Promise<Record<string, unknown>> {
  const res = await sm.send(new GetSecretValueCommand({ SecretId: credentialPath(participantId) }));
  return JSON.parse(res.SecretString ?? "{}");
}

export async function putCredential(participantId: string, payload: object): Promise<void> {
  const path = credentialPath(participantId);
  const value = JSON.stringify(payload);
  try {
    await sm.send(new PutSecretValueCommand({ SecretId: path, SecretString: value }));
  } catch {
    // Secret doesn't exist yet — create it
    await sm.send(new CreateSecretCommand({ Name: path, SecretString: value }));
  }
}

export async function deleteCredential(participantId: string): Promise<void> {
  await sm.send(
    new DeleteSecretCommand({
      SecretId: credentialPath(participantId),
      ForceDeleteWithoutRecovery: true,
    }),
  );
}

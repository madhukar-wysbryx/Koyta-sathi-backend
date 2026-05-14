import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Context, MiddlewareHandler } from "hono";

interface AuthPayload {
  userId: string;
  email: string;
  role: "participant" | "admin";
}

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthPayload;
  }
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(userPoolId: string, region: string) {
  if (!jwks) {
    const url = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    jwks = createRemoteJWKSet(new URL(url));
  }
  return jwks;
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const token = authHeader.slice(7);
  const userPoolId = process.env.COGNITO_USER_POOL_ID ?? "";
  const region = process.env.AWS_REGION ?? "ap-south-1";
  try {
    const { payload } = await jwtVerify(token, getJwks(userPoolId, region));
    c.set("auth", {
      userId: payload.sub ?? "",
      email: (payload.email as string) ?? "",
      role: ((payload["custom:role"] as string) ?? "participant") as "participant" | "admin",
    });
  } catch {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
};

export function requireRole(role: "admin"): MiddlewareHandler {
  return async (c, next) => {
    const auth = c.get("auth");
    if (auth.role !== role) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}

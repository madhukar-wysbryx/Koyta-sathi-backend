import { createHash } from "node:crypto";
import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { DeleteCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { zipSync } from "fflate";
import { Hono } from "hono";
import { ddb, tableNames } from "../lib/dynamo.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { scanAll } from "../lib/reports.js";
import { deleteObject } from "../lib/s3.js";
import { deleteCredential, getCredential, putCredential } from "../lib/secrets.js";

const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION ?? "ap-south-1" });
const USER_POOL_ID = process.env.USER_POOL_ID ?? "";
const EXPORT_SALT = process.env.EXPORT_SALT ?? "dev-salt";

export const adminRouter = new Hono();
adminRouter.use("*", requireAuth);
adminRouter.use("*", requireRole("admin"));

// ─── User management ────────────────────────────────────────────────────────

adminRouter.get("/users", async (c) => {
  const [users, budgets] = await Promise.all([
    scanAll(tableNames.users),
    scanAll(tableNames.budgetState),
  ]);
  const budgetMap = new Map((budgets as any[]).map((b) => [b.userId, b]));
  const rows = (users as any[]).map((u) => {
    const budget = budgetMap.get(u.userId);
    return {
      userId: u.userId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      village: u.village,
      wizardCompleted: !!(budget?.prioritization?.completedAt),
      installmentCount: budget?.installments?.length ?? 0,
      lastSeenAt: u.lastSeenAt,
      createdAt: u.createdAt,
    };
  });
  return c.json(rows);
});

adminRouter.post("/users", async (c) => {
  const { firstName, lastName, village, role = "participant" } = await c.req.json();

  // Determine next participant number from existing Cognito users
  const existing = await cognito.send(new ListUsersCommand({ UserPoolId: USER_POOL_ID, Limit: 60 }));
  const participantCount = (existing.Users ?? []).filter((u) =>
    u.Attributes?.some((a) => a.Name === "custom:role" && a.Value === "participant"),
  ).length;
  const nn = String(participantCount + 1).padStart(2, "0");
  const email = `participant-${nn}@wysbryxapp.com`;
  const tempPassword = `Koyta${nn}!${Math.random().toString(36).slice(2, 6)}`;

  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      // SUPPRESS prevents Cognito from emailing participants who have no inbox
      MessageAction: role === "participant" ? "SUPPRESS" : undefined,
      TemporaryPassword: tempPassword,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
        { Name: "custom:role", Value: role },
      ],
    }),
  );

  const participantId = `participant-${nn}`;
  if (role === "participant") {
    await putCredential(participantId, {
      login: email,
      tempPassword,
      realName: `${firstName} ${lastName}`,
      village,
      createdAt: new Date().toISOString(),
    });
  }

  return c.json({ email, participantId, tempPassword }, 201);
});

adminRouter.get("/users/:userId", async (c) => {
  const { userId } = c.req.param();
  const [user, budget, tracker, records] = await Promise.all([
    ddb.send(new GetCommand({ TableName: tableNames.users, Key: { userId } })),
    ddb.send(new GetCommand({ TableName: tableNames.budgetState, Key: { userId } })),
    ddb.send(new GetCommand({ TableName: tableNames.trackerOnboarding, Key: { userId } })),
    ddb.send(
      new QueryCommand({
        TableName: tableNames.dailyRecords,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
        ScanIndexForward: false,
      }),
    ),
  ]);
  if (!user.Item) return c.json({ error: "Not found" }, 404);
  return c.json({
    user: user.Item,
    budget: budget.Item ?? null,
    tracker: tracker.Item ?? null,
    dailyRecords: records.Items ?? [],
  });
});

// Returns the raw credential object for printing a credential slip
adminRouter.get("/users/:userId/credential-slip", async (c) => {
  const { userId } = c.req.param();
  const user = await ddb.send(new GetCommand({ TableName: tableNames.users, Key: { userId } }));
  if (!user.Item) return c.json({ error: "Not found" }, 404);
  const email = user.Item.email as string;
  const match = email.match(/participant-(\d+)@/);
  if (!match) return c.json({ error: "Not a participant" }, 400);
  const credential = await getCredential(`participant-${match[1]}`);
  return c.json(credential);
});

adminRouter.post("/users/:userId/reset-password", async (c) => {
  const { userId } = c.req.param();
  const user = await ddb.send(new GetCommand({ TableName: tableNames.users, Key: { userId } }));
  if (!user.Item) return c.json({ error: "Not found" }, 404);
  const email = user.Item.email as string;
  const match = email.match(/participant-(\d+)@/);
  if (!match) return c.json({ error: "Not a participant" }, 400);
  const nn = match[1];
  const participantId = `participant-${nn}`;
  const newTempPassword = `Koyta${nn}!${Math.random().toString(36).slice(2, 6)}`;

  await cognito.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      Password: newTempPassword,
      Permanent: false,
    }),
  );

  const existing = await getCredential(participantId);
  await putCredential(participantId, { ...existing, tempPassword: newTempPassword, resetAt: new Date().toISOString() });

  return c.json({ ok: true, newTempPassword });
});

adminRouter.delete("/users/:userId", async (c) => {
  const { userId } = c.req.param();
  const user = await ddb.send(new GetCommand({ TableName: tableNames.users, Key: { userId } }));
  if (!user.Item) return c.json({ error: "Not found" }, 404);
  const email = user.Item.email as string;

  // Delete Cognito user
  await cognito.send(new AdminDeleteUserCommand({ UserPoolId: USER_POOL_ID, Username: email }));

  // Query range-key tables before deleting
  const [records, slips] = await Promise.all([
    ddb.send(
      new QueryCommand({
        TableName: tableNames.dailyRecords,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
        ProjectionExpression: "occurredOn",
      }),
    ),
    ddb.send(
      new QueryCommand({
        TableName: tableNames.slips,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
        ProjectionExpression: "slipId, s3Key",
      }),
    ),
  ]);

  // Delete all DynamoDB rows and S3 objects
  await Promise.all([
    ddb.send(new DeleteCommand({ TableName: tableNames.users, Key: { userId } })),
    ddb.send(new DeleteCommand({ TableName: tableNames.budgetState, Key: { userId } })),
    ddb.send(new DeleteCommand({ TableName: tableNames.trackerOnboarding, Key: { userId } })),
    ...(records.Items ?? []).map((r) =>
      ddb.send(new DeleteCommand({ TableName: tableNames.dailyRecords, Key: { userId, occurredOn: r.occurredOn } })),
    ),
    ...(slips.Items ?? []).map(async (s) => {
      await deleteObject(s.s3Key as string);
      await ddb.send(new DeleteCommand({ TableName: tableNames.slips, Key: { userId, slipId: s.slipId } }));
    }),
  ]);

  // Delete Secrets Manager entry (best-effort — participant may not have one)
  const match = email.match(/participant-(\d+)@/);
  if (match) {
    try {
      await deleteCredential(`participant-${match[1]}`);
    } catch {}
  }

  return c.json({ ok: true });
});

// ─── Reports ────────────────────────────────────────────────────────────────

adminRouter.get("/reports/cohort-overview", async (c) => {
  const [users, budgets, trackers] = await Promise.all([
    scanAll(tableNames.users),
    scanAll(tableNames.budgetState),
    scanAll(tableNames.trackerOnboarding),
  ]);
  const completedWizard = (budgets as any[]).filter((b) => b.prioritization?.completedAt).length;
  const totalInstallments = (budgets as any[]).reduce((s, b) => s + (b.installments?.length ?? 0), 0);
  return c.json({
    totalParticipants: users.length,
    completedWizard,
    trackerActive: trackers.length,
    totalInstallments,
  });
});

adminRouter.get("/reports/funnel", async (c) => {
  const [users, events] = await Promise.all([
    scanAll(tableNames.users),
    scanAll<any>(tableNames.events),
  ]);
  const FUNNEL_STEPS = [
    "app_opened",
    "wizard_started",
    "wizard_completed",
    "tracker_onboarding_started",
    "tracker_onboarding_completed",
    "daily_record_logged",
    "pdf_generated",
  ];
  const userSets: Record<string, Set<string>> = {};
  for (const ev of events) {
    if (!userSets[ev.type]) userSets[ev.type] = new Set();
    userSets[ev.type].add(ev.userId);
  }
  const cohortSize = users.length;
  const stages: Record<string, { count: number; pct: number }> = {};
  for (const step of FUNNEL_STEPS) {
    const count = userSets[step]?.size ?? 0;
    stages[step] = { count, pct: cohortSize > 0 ? Math.round((count / cohortSize) * 100) : 0 };
  }
  return c.json({ cohortSize, stages });
});

adminRouter.get("/reports/repayment-progress", async (c) => {
  const [users, trackers, dailyRecords] = await Promise.all([
    scanAll<any>(tableNames.users),
    scanAll<any>(tableNames.trackerOnboarding),
    scanAll<any>(tableNames.dailyRecords),
  ]);
  const trackerMap = new Map(trackers.map((t) => [t.userId, t]));
  const wagesMap: Record<string, number> = {};
  for (const rec of dailyRecords) {
    wagesMap[rec.userId] = (wagesMap[rec.userId] ?? 0) + ((rec.wagesEarnedKoytaPaise as number) ?? 0);
  }
  const rows = users.map((u) => {
    const tracker = trackerMap.get(u.userId) as any;
    const totalAdvancePaise = tracker?.totalAdvancePaise ?? 0;
    const totalWagesPaise = wagesMap[u.userId] ?? 0;
    return {
      userId: u.userId,
      name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
      village: u.village,
      totalAdvancePaise,
      totalWagesPaise,
      debtRemainingPaise: totalAdvancePaise - totalWagesPaise,
    };
  });
  return c.json(rows);
});

// ─── Export ──────────────────────────────────────────────────────────────────

adminRouter.post("/export", async (c) => {
  const [users, budgets, trackers, dailyRecords, slips, events] = await Promise.all([
    scanAll<any>(tableNames.users),
    scanAll<any>(tableNames.budgetState),
    scanAll<any>(tableNames.trackerOnboarding),
    scanAll<any>(tableNames.dailyRecords),
    scanAll<any>(tableNames.slips),
    scanAll<any>(tableNames.events),
  ]);

  // Pseudonymise: SHA256(userId + salt) → first 16 hex chars; real mapping never via API
  const pid = (userId: string) =>
    createHash("sha256").update(userId + EXPORT_SALT).digest("hex").slice(0, 16);

  const toCsv = (rows: Record<string, unknown>[], cols: string[]) => {
    const lines = rows.map((r) => cols.map((col) => JSON.stringify(r[col] ?? "")).join(","));
    return [cols.join(","), ...lines].join("\n");
  };

  const csvFiles: Record<string, Uint8Array> = {};
  const enc = (s: string) => new TextEncoder().encode(s);

  csvFiles["users.csv"] = enc(toCsv(
    users.map((u) => ({
      participant_id: pid(u.userId), firstName: u.firstName, lastName: u.lastName,
      village: u.village, language: u.language, createdAt: u.createdAt,
    })),
    ["participant_id", "firstName", "lastName", "village", "language", "createdAt"],
  ));

  csvFiles["budget_state.csv"] = enc(toCsv(
    budgets.map((b) => ({
      participant_id: pid(b.userId),
      plannedAdvancePaise: b.planning?.plannedAdvancePaise,
      priorityAdvancePaise: b.priorityAdvancePaise,
      quizScore: b.quiz?.scoreCorrect,
      quizAttemptedAt: b.quiz?.attemptedAt,
      wizardCompletedAt: b.prioritization?.completedAt,
      updatedAt: b.updatedAt,
    })),
    ["participant_id", "plannedAdvancePaise", "priorityAdvancePaise", "quizScore", "quizAttemptedAt", "wizardCompletedAt", "updatedAt"],
  ));

  csvFiles["installments.csv"] = enc(toCsv(
    budgets.flatMap((b) =>
      (b.installments ?? []).map((inst: any) => ({
        participant_id: pid(b.userId), id: inst.id, amountPaise: inst.amountPaise,
        purpose: inst.purpose, occurredOn: inst.occurredOn, loggedAt: inst.loggedAt,
      })),
    ),
    ["participant_id", "id", "amountPaise", "purpose", "occurredOn", "loggedAt"],
  ));

  csvFiles["priority_categories.csv"] = enc(toCsv(
    budgets.flatMap((b) =>
      (b.priorityCategories ?? []).map((cat: any) => ({
        participant_id: pid(b.userId), position: cat.position, label: cat.label,
        amountPaise: cat.amountPaise, classification: cat.classification,
      })),
    ),
    ["participant_id", "position", "label", "amountPaise", "classification"],
  ));

  csvFiles["tracker_onboarding.csv"] = enc(toCsv(
    trackers.map((t) => ({
      participant_id: pid(t.userId), startDate: t.startDate, koytaType: t.koytaType,
      advanceTakenThisYearPaise: t.advanceTakenThisYearPaise,
      outstandingLastYearPaise: t.outstandingLastYearPaise,
      totalAdvancePaise: t.totalAdvancePaise, updatedAt: t.updatedAt,
    })),
    ["participant_id", "startDate", "koytaType", "advanceTakenThisYearPaise", "outstandingLastYearPaise", "totalAdvancePaise", "updatedAt"],
  ));

  csvFiles["daily_records.csv"] = enc(toCsv(
    dailyRecords.map((r) => ({
      participant_id: pid(r.userId), occurredOn: r.occurredOn, dayType: r.dayType,
      vehiclesFilled: r.vehiclesFilled, wagesEarnedToliPaise: r.wagesEarnedToliPaise,
      wagesEarnedKoytaPaise: r.wagesEarnedKoytaPaise, ratesVersionId: r.ratesVersionId,
      loggedAt: r.loggedAt,
    })),
    ["participant_id", "occurredOn", "dayType", "vehiclesFilled", "wagesEarnedToliPaise", "wagesEarnedKoytaPaise", "ratesVersionId", "loggedAt"],
  ));

  csvFiles["slips.csv"] = enc(toCsv(
    slips.map((s) => ({
      participant_id: pid(s.userId), slipId: s.slipId, capturedAt: s.capturedAt,
      voucherDate: s.voucherDate, factoryName: s.factoryName, voucherAmountPaise: s.voucherAmountPaise,
    })),
    ["participant_id", "slipId", "capturedAt", "voucherDate", "factoryName", "voucherAmountPaise"],
  ));

  csvFiles["events.csv"] = enc(toCsv(
    events.map((e) => ({
      participant_id: pid(e.userId), eventId: e.eventId, type: e.type,
      app: e.app, occurredAt: e.occurredAt,
    })),
    ["participant_id", "eventId", "type", "app", "occurredAt"],
  ));

  csvFiles["manifest.json"] = enc(JSON.stringify({
    exportedAt: new Date().toISOString(),
    stage: process.env.STAGE ?? "dev",
    counts: {
      users: users.length, budgets: budgets.length, dailyRecords: dailyRecords.length,
      slips: slips.length, events: events.length,
    },
  }, null, 2));

  const zipData = zipSync(csvFiles);
  const date = new Date().toISOString().slice(0, 10);

  return c.body(zipData as unknown as ArrayBuffer, 200, {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename=koyta-export-${date}.zip`,
  });
});

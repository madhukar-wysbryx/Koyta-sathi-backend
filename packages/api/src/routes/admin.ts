import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Hono } from "hono";
import { ddb, tableNames } from "../lib/dynamo.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const adminRouter = new Hono();

adminRouter.use("*", requireAuth);
adminRouter.use("*", requireRole("admin"));

adminRouter.get("/overview", async (c) => {
  const [users, budgets] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: tableNames.users, Select: "COUNT" })),
    ddb.send(new ScanCommand({ TableName: tableNames.budgetState })),
  ]);

  const budgetItems = budgets.Items ?? [];
  const totalParticipants = users.Count ?? 0;
  const completedWizard = budgetItems.filter((b) => b.prioritization?.completedAt).length;
  const activeTrackers = 0; // tracker scan deferred to avoid cold-start latency
  const totalInstallmentsLogged = budgetItems.reduce(
    (sum, b) => sum + (b.installments?.length ?? 0),
    0
  );
  const avgAdvancePaise =
    budgetItems.length > 0
      ? budgetItems.reduce((s, b) => s + (b.planning?.plannedAdvancePaise ?? 0), 0) / budgetItems.length
      : 0;

  return c.json({ totalParticipants, completedWizard, activeTrackers, totalInstallmentsLogged, avgAdvancePaise });
});

adminRouter.get("/participants", async (c) => {
  const [usersResult, budgetsResult] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: tableNames.users })),
    ddb.send(new ScanCommand({ TableName: tableNames.budgetState })),
  ]);

  const budgetMap = new Map((budgetsResult.Items ?? []).map((b) => [b.userId, b]));

  const participants = (usersResult.Items ?? []).map((u) => {
    const budget = budgetMap.get(u.userId);
    return {
      userId: u.userId,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      village: u.village,
      wizardCompleted: !!(budget?.prioritization?.completedAt),
      trackerActive: false,
      installmentCount: budget?.installments?.length ?? 0,
      createdAt: u.createdAt ?? u.updatedAt ?? "",
    };
  });

  return c.json(participants);
});

adminRouter.get("/reports", async (c) => {
  const budgets = await ddb.send(new ScanCommand({ TableName: tableNames.budgetState }));
  const items = budgets.Items ?? [];

  const plans = items.filter((b) => b.planning?.plannedAdvancePaise);
  const avgPlanned = plans.length ? plans.reduce((s, b) => s + b.planning.plannedAdvancePaise, 0) / plans.length : 0;
  const avgPriority = items.length ? items.reduce((s, b) => s + (b.priorityAdvancePaise ?? 0), 0) / items.length : 0;

  const quizItems = items.filter((b) => b.quiz?.attemptedAt);
  const quizAvgScore = quizItems.length ? quizItems.reduce((s, b) => s + (b.quiz?.scoreCorrect ?? 0), 0) / quizItems.length : 0;

  const avgInstallments = items.length ? items.reduce((s, b) => s + (b.installments?.length ?? 0), 0) / items.length : 0;

  // Village breakdown from users table
  const users = await ddb.send(new ScanCommand({ TableName: tableNames.users, ProjectionExpression: "village" }));
  const villageCounts: Record<string, number> = {};
  (users.Items ?? []).forEach((u) => {
    if (u.village) villageCounts[u.village] = (villageCounts[u.village] ?? 0) + 1;
  });
  const villageBreakdown = Object.entries(villageCounts).map(([village, count]) => ({ village, count }));

  // Purpose breakdown from installments
  const purposeCounts: Record<string, { count: number; totalPaise: number }> = {};
  items.forEach((b) => {
    (b.installments ?? []).forEach((inst: { purpose: string; amountPaise: number }) => {
      if (!purposeCounts[inst.purpose]) purposeCounts[inst.purpose] = { count: 0, totalPaise: 0 };
      purposeCounts[inst.purpose].count += 1;
      purposeCounts[inst.purpose].totalPaise += inst.amountPaise ?? 0;
    });
  });
  const purposeBreakdown = Object.entries(purposeCounts).map(([purpose, d]) => ({ purpose, ...d }));

  return c.json({
    avgPlannedAdvancePaise: avgPlanned,
    avgPriorityAdvancePaise: avgPriority,
    avgInstallmentsPerParticipant: avgInstallments,
    quizAvgScore,
    quizAttempts: quizItems.length,
    villageBreakdown,
    purposeBreakdown,
  });
});

adminRouter.get("/export", async (c) => {
  const format = c.req.query("format") ?? "json";

  const [users, budgets, trackers] = await Promise.all([
    ddb.send(new ScanCommand({ TableName: tableNames.users })),
    ddb.send(new ScanCommand({ TableName: tableNames.budgetState })),
    ddb.send(new ScanCommand({ TableName: tableNames.trackerState })),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    users: users.Items ?? [],
    budgetStates: budgets.Items ?? [],
    trackerStates: trackers.Items ?? [],
  };

  if (format === "csv") {
    // Flat CSV of installments for spreadsheet analysis
    const rows: string[] = ["userId,email,date,purpose,amountRupees"];
    const userMap = new Map((users.Items ?? []).map((u) => [u.userId, u.email]));
    (budgets.Items ?? []).forEach((b) => {
      (b.installments ?? []).forEach((inst: { purpose: string; amountPaise: number; occurredOn: string }) => {
        rows.push(`${b.userId},${userMap.get(b.userId) ?? ""},${inst.occurredOn},${inst.purpose},${(inst.amountPaise / 100).toFixed(0)}`);
      });
    });
    return new Response(rows.join("\n"), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=export.csv" },
    });
  }

  return c.json(data);
});

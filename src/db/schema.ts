import { 
  pgTable, uuid, varchar, text, decimal, integer, 
  timestamp, date, boolean, jsonb, pgEnum, primaryKey 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==================== ENUMS ====================
export const ledgerTypeEnum = pgEnum('ledger_type', ['taken', 'repaid']);
export const expenseSourceEnum = pgEnum('expense_source', ['mukaddam_advance', 'other_credit', 'own_savings']);
export const warningTypeEnum = pgEnum('warning_type', ['approaching_limit', 'exceeded_limit']);

// ==================== TABLE: USERS ====================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  phoneNumber: varchar('phone_number', { length: 15 }).unique().notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull().default(''),
  lastName: varchar('last_name', { length: 100 }).notNull().default(''),
  name: varchar('name', { length: 200 }).notNull().default(''),
  village: varchar('village', { length: 100 }),
  isTreatmentGroup: boolean('is_treatment_group').default(false),
  hasCompletedOnboarding: boolean('has_completed_onboarding').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Users Relations
export const usersRelations = relations(users, ({ many }) => ({
  pastSeasonData: many(pastSeasonData),
  priorityPlans: many(priorityPlans),
  advances: many(advances),
  advanceLedger: many(advanceLedger),
  quizAttempts: many(quizAttempts),
  prioritizingGames: many(prioritizingGame),
  expenses: many(expenses),
  warningLogs: many(warningLogs),
}));

// ==================== TABLE: PAST SEASON DATA (Screen 12) ====================
export const pastSeasonData = pgTable('past_season_data', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  seasonYear: varchar('season_year', { length: 10 }).notNull(),
  advanceTaken: decimal('advance_taken', { precision: 12, scale: 2 }),
  daysWorked: integer('days_worked'),
  arrearsAmount: decimal('arrears_amount', { precision: 12, scale: 2 }),
  plannedAdvance: decimal('planned_advance', { precision: 12, scale: 2 }),
  advancePendingAtStart: decimal('advance_pending_at_start', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const pastSeasonDataRelations = relations(pastSeasonData, ({ one }) => ({
  user: one(users, {
    fields: [pastSeasonData.userId],
    references: [users.id],
  }),
}));

// ==================== TABLE: PRIORITY PLANS (Screen 14-15) ====================
export const priorityPlans = pgTable('priority_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  seasonYear: varchar('season_year', { length: 10 }).notNull(),
  totalPriorityAmount: decimal('total_priority_amount', { precision: 12, scale: 2 }).default('0'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const priorityPlansRelations = relations(priorityPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [priorityPlans.userId],
    references: [users.id],
  }),
  items: many(priorityItems),
  advance: many(advances),
}));

// ==================== TABLE: PRIORITY ITEMS ====================
export const priorityItems = pgTable('priority_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  priorityPlanId: uuid('priority_plan_id').references(() => priorityPlans.id, { onDelete: 'cascade' }).notNull(),
  itemName: varchar('item_name', { length: 200 }).notNull(),
  estimatedAmount: decimal('estimated_amount', { precision: 12, scale: 2 }).notNull(),
  priorityOrder: integer('priority_order').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const priorityItemsRelations = relations(priorityItems, ({ one }) => ({
  priorityPlan: one(priorityPlans, {
    fields: [priorityItems.priorityPlanId],
    references: [priorityPlans.id],
  }),
}));

// ==================== TABLE: ADVANCES (Main Advance Record) ====================
export const advances = pgTable('advances', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  seasonYear: varchar('season_year', { length: 10 }).notNull(),
  plannedAmount: decimal('planned_amount', { precision: 12, scale: 2 }).default('0'),
  priorityAdvanceAmount: decimal('priority_advance_amount', { precision: 12, scale: 2 }).default('0'),
  totalTakenAmount: decimal('total_taken_amount', { precision: 12, scale: 2 }).default('0'),
  totalRepaidAmount: decimal('total_repaid_amount', { precision: 12, scale: 2 }).default('0'),
  remainingAmount: decimal('remaining_amount', { precision: 12, scale: 2 }).default('0'),
  priorityPlanId: uuid('priority_plan_id').references(() => priorityPlans.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const advancesRelations = relations(advances, ({ one, many }) => ({
  user: one(users, {
    fields: [advances.userId],
    references: [users.id],
  }),
  priorityPlan: one(priorityPlans, {
    fields: [advances.priorityPlanId],
    references: [priorityPlans.id],
  }),
  ledgerEntries: many(advanceLedger),
  warnings: many(warningLogs),
}));

// ==================== TABLE: ADVANCE LEDGER (Screen 17-18) ====================
export const advanceLedger = pgTable('advance_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  advanceId: uuid('advance_id').references(() => advances.id, { onDelete: 'cascade' }).notNull(),
  type: ledgerTypeEnum('type').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  purpose: varchar('purpose', { length: 255 }),
  remainingBalance: decimal('remaining_balance', { precision: 12, scale: 2 }).notNull(),
  visualPercentage: integer('visual_percentage'),
  date: date('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const advanceLedgerRelations = relations(advanceLedger, ({ one }) => ({
  user: one(users, {
    fields: [advanceLedger.userId],
    references: [users.id],
  }),
  advance: one(advances, {
    fields: [advanceLedger.advanceId],
    references: [advances.id],
  }),
}));

// ==================== TABLE: QUIZ QUESTIONS ====================
export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionText: text('question_text').notNull(),
  optionA: text('option_a').notNull(),
  optionB: text('option_b').notNull(),
  optionC: text('option_c').notNull(),
  optionD: text('option_d').notNull(),
  correctAnswer: varchar('correct_answer', { length: 10 }).notNull(),
  explanation: text('explanation'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const quizQuestionsRelations = relations(quizQuestions, ({ many }) => ({
  attempts: many(quizAttempts),
}));

// ==================== TABLE: QUIZ ATTEMPTS (Screen 5-6) ====================
export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  score: integer('score'),
  totalQuestions: integer('total_questions'),
  answers: jsonb('answers'),
  completedAt: timestamp('completed_at').defaultNow(),
});

export const quizAttemptsRelations = relations(quizAttempts, ({ one }) => ({
  user: one(users, {
    fields: [quizAttempts.userId],
    references: [users.id],
  }),
}));

// ==================== TABLE: PRIORITIZING GAME (Screen 9) ====================
export const prioritizingGame = pgTable('prioritizing_game', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  isMustHave: boolean('is_must_have').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const prioritizingGameRelations = relations(prioritizingGame, ({ one }) => ({
  user: one(users, {
    fields: [prioritizingGame.userId],
    references: [users.id],
  }),
}));

// ==================== TABLE: EXPENSES ====================
export const expenses = pgTable('expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  source: expenseSourceEnum('source').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  category: varchar('category', { length: 100 }),
  date: date('date').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

// ==================== TABLE: WARNING LOGS ====================
export const warningLogs = pgTable('warning_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  advanceId: uuid('advance_id').references(() => advances.id, { onDelete: 'cascade' }).notNull(),
  warningType: warningTypeEnum('warning_type').notNull(),
  currentAmount: decimal('current_amount', { precision: 12, scale: 2 }),
  limitAmount: decimal('limit_amount', { precision: 12, scale: 2 }),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const warningLogsRelations = relations(warningLogs, ({ one }) => ({
  user: one(users, {
    fields: [warningLogs.userId],
    references: [users.id],
  }),
  advance: one(advances, {
    fields: [warningLogs.advanceId],
    references: [advances.id],
  }),
}));
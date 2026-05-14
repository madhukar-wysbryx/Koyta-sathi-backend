export interface SeasonRecall {
  pendingStartPaise: number;
  advanceTakenPaise: number;
  monthsWorked: number;
  arrearsRemainingPaise: number;
}

export interface QuizState {
  selectedOptionIds: string[];
  scoreCorrect: number;
  scoreTotal: number;
  attemptedAt: string;
}

export type Classification = "must" | "wait" | "unclassified";

export interface PriorityCategory {
  position: number;
  label: string;
  amountPaise: number;
  classification: Classification;
}

export interface Installment {
  id: string;
  amountPaise: number;
  purpose: string;
  occurredOn: string;
  loggedAt: string;
}

export interface BudgetState {
  recall2024?: SeasonRecall;
  recall2025?: SeasonRecall;
  quiz?: QuizState;
  prioritization?: { completedAt?: string; expertTipShownAt?: string };
  planning?: { plannedAdvancePaise: number; revisedAt?: string };
  priorityCategories: PriorityCategory[];
  priorityAdvancePaise: number;
  budgetPdf?: { generatedAt?: string; s3Key?: string };
  installments: Installment[];
  updatedAt: string;
}

export const EMPTY_BUDGET_STATE: BudgetState = {
  priorityCategories: [],
  priorityAdvancePaise: 0,
  installments: [],
  updatedAt: new Date().toISOString(),
};

export function computeRepaymentMonths(
  plannedAdvancePaise: number,
  recall2024?: SeasonRecall,
  recall2025?: SeasonRecall,
  includeArrears = false
): number {
  const r24Monthly =
    recall2024 && recall2024.monthsWorked > 0
      ? recall2024.advanceTakenPaise / recall2024.monthsWorked
      : null;
  const r25Monthly =
    recall2025 && recall2025.monthsWorked > 0
      ? recall2025.advanceTakenPaise / recall2025.monthsWorked
      : null;

  const values = [r24Monthly, r25Monthly].filter((v): v is number => v !== null);
  const avgMonthly =
    values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 10_000_00; // ₹10,000 fallback in paise

  const arrears =
    includeArrears && recall2025 ? recall2025.arrearsRemainingPaise : 0;
  const total = plannedAdvancePaise + arrears;
  return Math.ceil(total / Math.max(avgMonthly, 1));
}

export function sumMustHavePaise(categories: PriorityCategory[]): number {
  return categories
    .filter((c) => c.classification === "must")
    .reduce((sum, c) => sum + c.amountPaise, 0);
}

export function pToRupee(paise: number): string {
  return (paise / 100).toFixed(0);
}

export function rupeeToPaise(rupees: string | number): number {
  return Math.round(Number(rupees) * 100);
}

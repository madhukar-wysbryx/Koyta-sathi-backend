import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BudgetState, Installment, PriorityCategory, SeasonRecall } from "@kothi/shared/types/budget";
import { EMPTY_BUDGET_STATE, rupeeToPaise, sumMustHavePaise } from "@kothi/shared/types/budget";
import { api } from "@kothi/shared/lib/api";

export interface PriorityQuizEntry {
  category: string;
  choice: "must" | "cant_wait";
}

interface BudgetStore {
  state: BudgetState;
  isSyncing: boolean;
  priorityQuizEntries: PriorityQuizEntry[];

  // Actions
  setRecall: (year: "2024" | "2025", data: SeasonRecall) => void;
  setQuiz: (selectedIds: string[], scoreCorrect: number) => void;
  setPriorityQuiz: (entries: PriorityQuizEntry[]) => void;
  setPlanning: (plannedAdvancePaise: number) => void;
  setPriorityCategories: (cats: PriorityCategory[]) => void;
  setInstallments: (items: Installment[]) => void;
  addInstallment: (item: Omit<Installment, "id" | "loggedAt">) => void;
  markPrioritizationComplete: () => void;

  // Persistence
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
}

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set, get) => ({
      state: EMPTY_BUDGET_STATE,
      isSyncing: false,
      priorityQuizEntries: [],

      setRecall: (year, data) => {
        set((s) => ({
          state: {
            ...s.state,
            [`recall${year}`]: data,
            updatedAt: new Date().toISOString(),
          },
        }));
        void get().saveToServer();
      },

      setPriorityQuiz: (entries) => {
        set({ priorityQuizEntries: entries });
      },

      setQuiz: (selectedIds, scoreCorrect) => {
        set((s) => ({
          state: {
            ...s.state,
            quiz: {
              selectedOptionIds: selectedIds,
              scoreCorrect,
              scoreTotal: 5,
              attemptedAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
          },
        }));
        void get().saveToServer();
      },

      setPlanning: (plannedAdvancePaise) => {
        set((s) => ({
          state: {
            ...s.state,
            planning: { plannedAdvancePaise, revisedAt: new Date().toISOString() },
            updatedAt: new Date().toISOString(),
          },
        }));
        void get().saveToServer();
      },

      setPriorityCategories: (cats) => {
        const priorityAdvancePaise = sumMustHavePaise(cats);
        set((s) => ({
          state: {
            ...s.state,
            priorityCategories: cats,
            priorityAdvancePaise,
            updatedAt: new Date().toISOString(),
          },
        }));
        void get().saveToServer();
      },

      markPrioritizationComplete: () => {
        set((s) => ({
          state: {
            ...s.state,
            prioritization: {
              ...s.state.prioritization,
              completedAt: new Date().toISOString(),
            },
            updatedAt: new Date().toISOString(),
          },
        }));
        void get().saveToServer();
      },

      setInstallments: (items) => {
        set((s) => ({
          state: { ...s.state, installments: items, updatedAt: new Date().toISOString() },
        }));
        void get().saveToServer();
      },

      addInstallment: (item) => {
        const newItem: Installment = {
          ...item,
          id: `inst_${Date.now()}`,
          loggedAt: new Date().toISOString(),
        };
        set((s) => ({
          state: {
            ...s.state,
            installments: [newItem, ...s.state.installments],
            updatedAt: new Date().toISOString(),
          },
        }));
        void get().saveToServer();
      },

      loadFromServer: async () => {
        try {
          const data = await api.get<BudgetState | null>("/budget-state");
          if (data) set({ state: data });
        } catch {
          // network error — use local persisted state
        }
      },

      saveToServer: async () => {
        set({ isSyncing: true });
        try {
          await api.put("/budget-state", get().state);
        } catch {
          // will retry next save
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: "kothi_budget_state",
      partialize: (s) => ({ state: s.state }),
    }
  )
);

export { rupeeToPaise };

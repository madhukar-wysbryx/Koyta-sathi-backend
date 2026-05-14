import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TrackerOnboarding, DailyRecord } from "@kothi/shared/types/tracker";
import { api } from "@kothi/shared/lib/api";

interface TrackerState {
  onboarding?: TrackerOnboarding;
  records: DailyRecord[];
  updatedAt: string;
}

interface TrackerStore {
  state: TrackerState;
  isSyncing: boolean;
  setOnboarding: (data: TrackerOnboarding) => void;
  addRecord: (record: Omit<DailyRecord, "loggedAt">) => void;
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
}

const EMPTY: TrackerState = {
  records: [],
  updatedAt: new Date().toISOString(),
};

export const useTrackerStore = create<TrackerStore>()(
  persist(
    (set, get) => ({
      state: EMPTY,
      isSyncing: false,

      setOnboarding: (data) => {
        set((s) => ({ state: { ...s.state, onboarding: data, updatedAt: new Date().toISOString() } }));
        void get().saveToServer();
      },

      addRecord: (record) => {
        const newRecord: DailyRecord = { ...record, loggedAt: new Date().toISOString() };
        set((s) => ({
          state: {
            ...s.state,
            records: [newRecord, ...s.state.records],
            updatedAt: new Date().toISOString(),
          },
        }));
        void get().saveToServer();
      },

      loadFromServer: async () => {
        try {
          const data = await api.get<TrackerState | null>("/tracker-state");
          if (data) set({ state: data });
        } catch {
          // use local state
        }
      },

      saveToServer: async () => {
        set({ isSyncing: true });
        try {
          await api.put("/tracker-state", get().state);
        } catch {
          // retry on next save
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: "kothi_tracker_state",
      partialize: (s) => ({ state: s.state }),
    }
  )
);

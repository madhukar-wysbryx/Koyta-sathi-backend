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
        // PUT only the onboarding blob — daily records are stored individually
        void api.put("/tracker-onboarding", data);
      },

      addRecord: (record) => {
        const newRecord: DailyRecord = { ...record, loggedAt: new Date().toISOString() };
        // Optimistic update — dedup on occurredOn so re-submitting a day overwrites cleanly
        set((s) => ({
          state: {
            ...s.state,
            records: [newRecord, ...s.state.records.filter((r) => r.occurredOn !== newRecord.occurredOn)],
            updatedAt: new Date().toISOString(),
          },
        }));
        // POST individual record to daily_records table (idempotent on userId+occurredOn)
        void api.post("/daily-records", newRecord);
      },

      loadFromServer: async () => {
        set({ isSyncing: true });
        try {
          const [onboarding, recordsRes] = await Promise.all([
            api.get<TrackerOnboarding | null>("/tracker-onboarding"),
            api.get<{ records: DailyRecord[] }>("/daily-records"),
          ]);
          set((s) => ({
            state: {
              ...s.state,
              onboarding: onboarding ?? s.state.onboarding,
              records: recordsRes?.records ?? s.state.records,
              updatedAt: new Date().toISOString(),
            },
          }));
        } catch {
          // keep local state on network failure
        } finally {
          set({ isSyncing: false });
        }
      },

      // Syncs only the onboarding blob — individual records are written in addRecord
      saveToServer: async () => {
        const { onboarding } = get().state;
        if (!onboarding) return;
        set({ isSyncing: true });
        try {
          await api.put("/tracker-onboarding", onboarding);
        } catch {
          // retry on next save
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: "kothi_tracker_onboarding",
      partialize: (s) => ({ state: s.state }),
    }
  )
);

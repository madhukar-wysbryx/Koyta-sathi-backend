import type { AppName, EventType, TrackedEvent } from "./types.js";

const QUEUE_KEY = "kothi_event_queue";
const FLUSH_INTERVAL_MS = 30_000;

let flushTimer: ReturnType<typeof setInterval> | null = null;
let queue: TrackedEvent[] = [];
let currentApp: AppName = "budget";

function loadQueue(): TrackedEvent[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persistQueue(q: TrackedEvent[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    // localStorage unavailable — tolerate silently
  }
}

async function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0);
  persistQueue(queue);
  try {
    const apiUrl = (globalThis as Record<string, unknown>).__KOTHI_API_URL__ as string | undefined;
    if (!apiUrl) return;
    await fetch(`${apiUrl}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
  } catch {
    queue.unshift(...batch);
    persistQueue(queue);
  }
}

export const events = {
  init(app: AppName) {
    currentApp = app;
    queue = loadQueue();
    if (!flushTimer) {
      flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        void flush();
      }
    });
  },

  track(type: EventType, payload?: Record<string, unknown>) {
    const event: TrackedEvent = {
      type,
      payload,
      occurredAt: new Date().toISOString(),
      app: currentApp,
    };
    queue.push(event);
    persistQueue(queue);
  },

  flush,
};

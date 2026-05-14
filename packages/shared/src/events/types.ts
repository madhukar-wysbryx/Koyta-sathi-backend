export type AppName = "budget" | "tracker" | "admin";

export type EventType =
  | "app_opened"
  | "login_succeeded"
  | "wizard_started"
  | "wizard_step_completed"
  | "wizard_completed"
  | "pdf_generated"
  | "pdf_downloaded"
  | "daily_record_logged"
  | "slip_uploaded"
  | "admin_action"
  | "installment_logged"
  | "tracker_onboarding_started"
  | "tracker_onboarding_completed";

export interface TrackedEvent {
  type: EventType;
  payload?: Record<string, unknown>;
  occurredAt: string;
  app: AppName;
}

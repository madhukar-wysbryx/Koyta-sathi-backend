import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { events } from "@kothi/shared";
import { LanguageToggle } from "../components/LanguageToggle";
import { useBudgetStore, rupeeToPaise } from "./store";

interface FormData {
  pendingStart: string;
  advanceTaken: string;
  monthsWorked: string;
  arrearsRemaining: string;
}

interface Props {
  year: "2024" | "2025";
}

export function PastSeasonRecall({ year }: Props) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const setRecall = useBudgetStore((s) => s.setRecall);

  const stepNum = year === "2024" ? 2 : 3;
  const nextPath = year === "2024" ? "/recall-2025" : "/story/geeta-1";
  const backPath = year === "2024" ? "/onboarding" : "/recall-2024";
  const titleKey = year === "2024" ? "budget.recall.title_2024" : "budget.recall.title_2025";

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({ mode: "onChange" });

  const onSubmit = (data: FormData) => {
    setRecall(year, {
      pendingStartPaise: rupeeToPaise(data.pendingStart),
      advanceTakenPaise: rupeeToPaise(data.advanceTaken),
      monthsWorked: Number(data.monthsWorked),
      arrearsRemainingPaise: rupeeToPaise(data.arrearsRemaining),
    });
    events.track("wizard_step_completed", { wizard: "budget", step: stepNum + 1, stepName: `recall_${year}` });
    navigate(nextPath);
  };

  return (
    <div className="screen">
      <div className="wizard-header">
        <button className="btn btn-ghost" style={{ padding: "8px 4px" }} onClick={() => navigate(backPath)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <LanguageToggle />
      </div>

      <div className="screen-body">
        <div className="animate-fade-up">
          <p className="story-module-tag">Step {stepNum} of 17</p>
          <h2>{t(titleKey)}</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 15, marginTop: 8 }}>
            Enter the amounts you remember from the season. Estimates are fine.
          </p>
        </div>

        <form
          id="recall-form"
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
          className="animate-fade-up animate-fade-up-2"
        >
          <div className="input-group">
            <label className="input-label">{t("budget.recall.advance_pending_start")}</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                color: "var(--color-text-muted)", fontSize: 15, fontWeight: 500,
              }}>₹</span>
              <input
                className={`input ${errors.pendingStart ? "input-error" : ""}`}
                style={{ paddingLeft: 28 }}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                {...register("pendingStart", { required: true, min: 0 })}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">{t("budget.recall.advance_taken")}</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                color: "var(--color-text-muted)", fontSize: 15, fontWeight: 500,
              }}>₹</span>
              <input
                className={`input ${errors.advanceTaken ? "input-error" : ""}`}
                style={{ paddingLeft: 28 }}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                {...register("advanceTaken", { required: true, min: 0 })}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">{t("budget.recall.months_worked")}</label>
            <input
              className={`input ${errors.monthsWorked ? "input-error" : ""}`}
              type="number"
              inputMode="numeric"
              min="1"
              max="12"
              placeholder="e.g. 5"
              {...register("monthsWorked", { required: true, min: 1, max: 12 })}
            />
          </div>

          <div className="input-group">
            <label className="input-label">{t("budget.recall.arrears_remaining")}</label>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                color: "var(--color-text-muted)", fontSize: 15, fontWeight: 500,
              }}>₹</span>
              <input
                className={`input ${errors.arrearsRemaining ? "input-error" : ""}`}
                style={{ paddingLeft: 28 }}
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                {...register("arrearsRemaining", { required: true, min: 0 })}
              />
            </div>
          </div>
        </form>
      </div>

      <div className="screen-footer">
        <button
          type="submit"
          form="recall-form"
          className="btn btn-primary btn-full btn-lg"
          disabled={!isValid}
        >
          {t("common.continue")}
        </button>
      </div>
    </div>
  );
}

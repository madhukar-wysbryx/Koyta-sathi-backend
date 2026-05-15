import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { events } from "@kothi/shared";
import { useAuth } from "@kothi/shared";
import { LanguageToggle } from "../components/LanguageToggle";
import { api } from "@kothi/shared/lib/api";

const VILLAGES = ["Beed", "Latur", "Osmanabad", "Solapur", "Akola", "Amravati"];

interface FormData {
  firstName: string;
  lastName: string;
  village: string;
}

export function OnboardingProfile() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({ mode: "onChange" });

  const onSubmit = async (data: FormData) => {
    try {
      await api.put("/me/profile", {
        firstName: data.firstName,
        lastName: data.lastName,
        village: data.village,
      });
    } catch {
      // non-blocking — profile saves best-effort
    }
    events.track("wizard_step_completed", { wizard: "budget", step: 2, stepName: "onboarding" });
    navigate("/story/geeta-1");
  };

  return (
    <div className="screen">
      <div className="wizard-header">
        <button className="btn btn-ghost" style={{ padding: "8px 4px" }} onClick={() => navigate("/")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <LanguageToggle />
      </div>

      <div className="screen-body">
        <div className="animate-fade-up">
          <p className="story-module-tag">Step 1 of 17</p>
          <h2>{t("budget.onboarding.title")}</h2>
        </div>

        <form
          id="profile-form"
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
          className="animate-fade-up animate-fade-up-2"
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="input-group">
              <label className="input-label">{t("budget.onboarding.first_name")}</label>
              <input
                className={`input ${errors.firstName ? "input-error" : ""}`}
                {...register("firstName", { required: true })}
                autoComplete="given-name"
              />
            </div>
            <div className="input-group">
              <label className="input-label">{t("budget.onboarding.last_name")}</label>
              <input
                className={`input ${errors.lastName ? "input-error" : ""}`}
                {...register("lastName", { required: true })}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">{t("budget.onboarding.village")}</label>
            <select
              className={`select ${errors.village ? "input-error" : ""}`}
              {...register("village", { required: true })}
            >
              <option value="">{t("budget.onboarding.village_placeholder")}</option>
              {VILLAGES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </form>
      </div>

      <div className="screen-footer">
        <button
          type="submit"
          form="profile-form"
          className="btn btn-primary btn-full btn-lg"
          disabled={!isValid}
        >
          {t("common.continue")}
        </button>
      </div>
    </div>
  );
}

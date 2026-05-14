import { useEffect } from "react";
import { Route, Switch } from "wouter";
import { useAuth } from "@kothi/shared";
import { LoginScreen } from "../components/LoginScreen";
import { Welcome } from "../budget/Welcome";
import { OnboardingProfile } from "../budget/OnboardingProfile";
import { PastSeasonRecall } from "../budget/PastSeasonRecall";
import { StoryScreen } from "../budget/StoryScreen";
import { QuizScreen } from "../budget/QuizScreen";
import { AdvancePlan } from "../budget/AdvancePlan";
import { PriorityPlanIntro } from "../budget/PriorityPlanIntro";
import { PriorityPlanStage1 } from "../budget/PriorityPlanStage1";
import { PriorityPlanStage2 } from "../budget/PriorityPlanStage2";
import { BudgetPdfScreen } from "../budget/BudgetPdfScreen";
import { ReadyToTrack } from "../budget/ReadyToTrack";
import { BudgetAppShell } from "../budget/BudgetAppShell";

export function BudgetShell() {
  const { user, isLoading, hydrate } = useAuth();

  useEffect(() => {
    void hydrate();

    // Logout on tab close to prevent shared-phone session bleed
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        // Tab hidden — not full close, so we don't sign out here.
        // Full close is handled by Amplify's session storage.
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [hydrate]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg)",
        }}
      >
        <span className="spinner" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <Switch>
      <Route path="/" component={Welcome} />
      <Route path="/onboarding" component={OnboardingProfile} />
      <Route path="/recall-2024" component={() => <PastSeasonRecall year="2024" />} />
      <Route path="/recall-2025" component={() => <PastSeasonRecall year="2025" />} />
      <Route path="/story/geeta-1" component={() => <StoryScreen storyKey="geeta_1" />} />
      <Route path="/story/geeta-2" component={() => <StoryScreen storyKey="geeta_2" />} />
      <Route path="/quiz" component={QuizScreen} />
      <Route path="/story/gauri" component={() => <StoryScreen storyKey="gauri" />} />
      <Route path="/story/jagdish" component={() => <StoryScreen storyKey="jagdish" />} />
      <Route path="/advance-plan" component={AdvancePlan} />
      <Route path="/priority-intro" component={PriorityPlanIntro} />
      <Route path="/priority-1" component={PriorityPlanStage1} />
      <Route path="/priority-2" component={PriorityPlanStage2} />
      <Route path="/budget-pdf" component={BudgetPdfScreen} />
      <Route path="/ready" component={ReadyToTrack} />
      <Route path="/dashboard" component={BudgetAppShell} />
      <Route component={Welcome} />
    </Switch>
  );
}

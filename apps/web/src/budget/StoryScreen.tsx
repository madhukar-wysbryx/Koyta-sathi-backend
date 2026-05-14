import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { events } from "@kothi/shared";
import { LanguageToggle } from "../components/LanguageToggle";
import { TTSButton } from "../components/TTSButton";

type StoryKey = "geeta_1" | "geeta_2" | "gauri" | "jagdish";

interface Props {
  storyKey: StoryKey;
}

interface StoryConfig {
  step: number;
  nextPath: string;
  backPath: string;
  paragraphs: string[];
  moral?: string;
}

const STORY_CONFIGS: Record<StoryKey, StoryConfig> = {
  geeta_1: {
    step: 4,
    nextPath: "/story/geeta-2",
    backPath: "/recall-2025",
    paragraphs: [
      "Geeta tai has been a koyta cutter for fifteen years. Every season she travels from Osmanabad to the sugarcane fields of Solapur with her husband and two children.",
      "In her early years, Geeta would take whatever advance the mukaddam offered — sometimes ₹80,000 or more — thinking more money means less worry. But by March, she found herself still working just to repay the debt, with nothing extra left.",
      "\"I was earning all season but felt poorer every year,\" she says. \"The advance was like a well with no bottom.\"",
      "One year, before the season began, Geeta sat with her family and listed every expense they needed — food, school fees, medicine, and a small amount for emergencies. She added them up. The number was less than what the mukaddam usually offered.",
      "That year, she took only what she needed. By February, her debt was repaid. She brought ₹12,000 home.",
    ],
    moral: "Taking only what you need is the first step to keeping what you earn.",
  },
  geeta_2: {
    step: 5,
    nextPath: "/quiz",
    backPath: "/story/geeta-1",
    paragraphs: [
      "From her experience, Geeta tai learned a simple method to plan her advance budget every year.",
      "Step 1 — Remember the past. How much did I take last year? How long did it take to repay? This tells you if you're improving or getting deeper into debt.",
      "Step 2 — List the must-haves. Food, medicine, school fees, debt repayment. These come first. Everything else waits.",
      "Step 3 — Estimate the season. How many months will we work? How much will we earn per month? Use last year's numbers as a guide.",
      "Step 4 — Set the limit. Take only what covers the must-haves. Ask the mukaddam for additional advance only if a true emergency comes.",
      "Step 5 — Track every rupee. Write down every installment as it happens. This way, there are no surprises at season end.",
    ],
  },
  gauri: {
    step: 7,
    nextPath: "/story/jagdish",
    backPath: "/quiz",
    paragraphs: [
      "Gauri's daughter was getting married in November — just before the koyta season. The wedding required ₹1,20,000. Gauri took most of it as advance from the mukaddam.",
      "The season began in December. Every week, the family worked hard. But the debt was so large that by February — when Gauri's mother fell ill — there was no room to take more advance for medicine.",
      "Gauri had to borrow from a neighbour at high interest. The season ended in April and she returned home with ₹4,000 and a new debt.",
      "\"I would not change the wedding,\" Gauri says. \"But I wish I had planned for it one season ahead. A small amount saved each month would have changed everything.\"",
      "A budget does not judge your choices. It helps you prepare for them.",
    ],
    moral: "Plan big expenses one season ahead. A budget is not a restriction — it is preparation.",
  },
  jagdish: {
    step: 8,
    nextPath: "/advance-plan",
    backPath: "/story/gauri",
    paragraphs: [
      "Jagdish is a tractor driver who works with a koyta toli of twelve cutters. Two years ago he started writing down every advance installment on a small notebook.",
      "\"Before, I trusted memory. Memory is kind to us — it forgets the small amounts. The notebook does not forget.\"",
      "By January, Jagdish could see exactly how much debt remained. When the mukaddam offered another installment for a new phone, Jagdish said no. The phone could wait.",
      "That season, Jagdish repaid his advance by March 5th. He worked the remaining six weeks earning wages that were entirely his. He brought ₹22,000 home.",
      "Now he helps his toli members track their own advances. \"We all work the same fields. The only difference is whether you know where your money is going.\"",
    ],
    moral: "A ledger is more powerful than memory. What you track, you control.",
  },
};

export function StoryScreen({ storyKey }: Props) {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const config = STORY_CONFIGS[storyKey];

  const titleKey = `budget.story_${storyKey}.title` as const;
  const moduleKey = `budget.story_${storyKey}.module` as const;

  const allText = config.paragraphs.join(" ") + (config.moral ? " " + config.moral : "");

  const handleContinue = () => {
    events.track("wizard_step_completed", { wizard: "budget", step: config.step + 1, stepName: `story_${storyKey}` });
    navigate(config.nextPath);
  };

  return (
    <div className="screen">
      <div className="wizard-header">
        <button className="btn btn-ghost" style={{ padding: "8px 4px" }} onClick={() => navigate(config.backPath)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TTSButton text={allText} />
          <LanguageToggle />
        </div>
      </div>

      <div className="screen-body">
        <div className="animate-fade-up">
          <p className="story-module-tag">Step {config.step} of 17 · {t(moduleKey)}</p>
          <h2 style={{ marginBottom: 8 }}>{t(titleKey)}</h2>
        </div>

        <div className="animate-fade-up animate-fade-up-2" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {config.paragraphs.map((para, i) => (
            <p key={i} className="story-text">
              {para}
            </p>
          ))}

          {config.moral && (
            <div className="banner info" style={{ marginTop: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span style={{ fontStyle: "italic" }}>{config.moral}</span>
            </div>
          )}
        </div>
      </div>

      <div className="screen-footer">
        <button className="btn btn-primary btn-full btn-lg" onClick={handleContinue}>
          {t("common.continue")}
        </button>
      </div>
    </div>
  );
}

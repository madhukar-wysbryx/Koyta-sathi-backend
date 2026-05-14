import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { events } from "@kothi/shared";
import { LanguageToggle } from "../components/LanguageToggle";
import { useBudgetStore } from "./store";

interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

interface Question {
  id: string;
  text: string;
  options: QuizOption[];
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    text: "Before the koyta season, what should you do FIRST?",
    options: [
      { id: "q1a", text: "Ask the mukaddam for the maximum advance available", correct: false },
      { id: "q1b", text: "List your must-have expenses and estimate the total", correct: true },
      { id: "q1c", text: "Wait and see how the season goes", correct: false },
      { id: "q1d", text: "Borrow from neighbours to avoid advance debt", correct: false },
    ],
  },
  {
    id: "q2",
    text: "Which of these is a 'Must Have' expense that should be paid first?",
    options: [
      { id: "q2a", text: "A new smartphone", correct: false },
      { id: "q2b", text: "A wedding celebration", correct: false },
      { id: "q2c", text: "Medicine and health expenses", correct: true },
      { id: "q2d", text: "New jewellery", correct: false },
    ],
  },
  {
    id: "q3",
    text: "What is the main benefit of writing down each advance installment?",
    options: [
      { id: "q3a", text: "To show the mukaddam you are serious", correct: false },
      { id: "q3b", text: "To know exactly how much debt remains at any time", correct: true },
      { id: "q3c", text: "To remember the dates of payments", correct: false },
      { id: "q3d", text: "To qualify for a larger advance next season", correct: false },
    ],
  },
  {
    id: "q4",
    text: "Geeta tai says: \"Taking more advance than you need is like...\"",
    options: [
      { id: "q4a", text: "...having extra safety money", correct: false },
      { id: "q4b", text: "...a well with no bottom — you feel poorer every year", correct: true },
      { id: "q4c", text: "...being prepared for emergencies", correct: false },
      { id: "q4d", text: "...earning more wages in the season", correct: false },
    ],
  },
  {
    id: "q5",
    text: "Jagdish brought home ₹22,000 at the end of the season. How?",
    options: [
      { id: "q5a", text: "He got a better rate from the factory", correct: false },
      { id: "q5b", text: "He worked longer hours than other cutters", correct: false },
      { id: "q5c", text: "He tracked his advance and said no to extra installments after he saw the total", correct: true },
      { id: "q5d", text: "He borrowed from neighbours instead of taking advance", correct: false },
    ],
  },
];

export function QuizScreen() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const setQuiz = useBudgetStore((s) => s.setQuiz);

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = QUESTIONS.every((q) => selected[q.id]);

  const handleToggle = (questionId: string, optionId: string) => {
    if (submitted) return;
    setSelected((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleCheck = () => {
    const score = QUESTIONS.filter((q) => {
      const sel = selected[q.id];
      return q.options.find((o) => o.id === sel)?.correct;
    }).length;

    const selectedIds = Object.values(selected);
    setQuiz(selectedIds, score);
    setSubmitted(true);
  };

  const handleContinue = () => {
    events.track("wizard_step_completed", { wizard: "budget", step: 7, stepName: "quiz" });
    navigate("/story/gauri");
  };

  const getScore = () => {
    return QUESTIONS.filter((q) => {
      const sel = selected[q.id];
      return q.options.find((o) => o.id === sel)?.correct;
    }).length;
  };

  return (
    <div className="screen">
      <div className="wizard-header">
        <button className="btn btn-ghost" style={{ padding: "8px 4px" }} onClick={() => navigate("/story/geeta-2")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <LanguageToggle />
      </div>

      <div className="screen-body">
        <div className="animate-fade-up">
          <p className="story-module-tag">Step 6 of 17</p>
          <h2>{t("budget.quiz.title")}</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 15, marginTop: 4 }}>
            {t("budget.quiz.subtitle")}
          </p>
        </div>

        {submitted && (
          <div className="banner info animate-fade-up">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>
              {t("budget.quiz.score", { score: getScore(), total: QUESTIONS.length })}
            </span>
          </div>
        )}

        <div className="animate-fade-up animate-fade-up-2" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {QUESTIONS.map((q, qi) => {
            const selectedId = selected[q.id];
            const correct = q.options.find((o) => o.id === selectedId)?.correct;

            return (
              <div key={q.id}>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: "var(--color-text-primary)" }}>
                  {qi + 1}. {q.text}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {q.options.map((opt) => {
                    const isSelected = selectedId === opt.id;
                    let borderColor = "var(--color-border)";
                    let bg = "var(--color-surface)";

                    if (submitted && isSelected) {
                      borderColor = opt.correct ? "var(--color-success, #16a34a)" : "var(--color-error, #dc2626)";
                      bg = opt.correct ? "color-mix(in srgb, var(--color-success, #16a34a) 10%, transparent)" : "color-mix(in srgb, var(--color-error, #dc2626) 10%, transparent)";
                    } else if (!submitted && isSelected) {
                      borderColor = "var(--color-accent)";
                      bg = "color-mix(in srgb, var(--color-accent) 8%, transparent)";
                    }

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleToggle(q.id, opt.id)}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "12px 14px",
                          borderRadius: "var(--radius-md)",
                          border: `0.5px solid ${borderColor}`,
                          background: bg,
                          fontSize: 14,
                          color: "var(--color-text-primary)",
                          cursor: submitted ? "default" : "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
                {submitted && !correct && selectedId && (
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6, paddingLeft: 4 }}>
                    Correct: {q.options.find((o) => o.correct)?.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="screen-footer">
        {!submitted ? (
          <button
            className="btn btn-primary btn-full btn-lg"
            disabled={!allAnswered}
            onClick={handleCheck}
          >
            {t("budget.quiz.check")}
          </button>
        ) : (
          <button className="btn btn-primary btn-full btn-lg" onClick={handleContinue}>
            {t("common.continue")}
          </button>
        )}
      </div>
    </div>
  );
}

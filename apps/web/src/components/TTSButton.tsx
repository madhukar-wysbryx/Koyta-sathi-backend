import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface TTSButtonProps {
  text: string;
}

export function TTSButton({ text }: TTSButtonProps) {
  const { i18n } = useTranslation();
  const [speaking, setSpeaking] = useState(false);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  const toggle = useCallback(() => {
    if (!("speechSynthesis" in window)) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = i18n.language === "mr" ? "mr-IN" : "en-IN";
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    uttRef.current = utt;
    window.speechSynthesis.speak(utt);
    setSpeaking(true);
  }, [text, speaking, i18n.language]);

  if (!("speechSynthesis" in window)) return null;

  return (
    <button
      onClick={toggle}
      aria-label={speaking ? "Stop reading" : "Read aloud"}
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "0.5px solid var(--color-border-strong)",
        background: speaking ? "var(--color-accent-light)" : "var(--color-surface)",
        color: speaking ? "var(--color-accent)" : "var(--color-text-muted)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        transition: "all 0.15s ease",
      }}
    >
      {speaking ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  );
}

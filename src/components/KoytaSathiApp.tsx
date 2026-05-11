'use client';

/**
 * Koyta-Sathi — Financial Literacy & Advance Tracking App
 * For sugarcane cutter (koyta) families in Maharashtra
 * Harvard University / SOPPECOM Research Initiative
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  User,
  MapPin,
  Volume2,
  PlusCircle,
  Wallet,
  Calendar,
  Download,
  BookOpen,
  TrendingUp,
  History,
  Target,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Step =
  | 'disclaimer'
  | 'profile'
  | 'training-story'
  | 'training-quiz'
  | 'training-gauri'
  | 'training-jagdish'
  | 'training-prioritize'
  | 'recall-2024'
  | 'recall-2025'
  | 'planning-advance'
  | 'planning-categories'
  | 'planning-priority-tag'
  | 'budget-pdf'
  | 'transition'
  | 'dashboard'
  | 'add-installment';

interface Profile {
  firstName: string;
  lastName: string;
  village: string;
}

interface YearRecall {
  pendingStart: number;
  advanceTaken: number;
  monthsWorked: number;
  arrearsRemaining: number;
}

interface SpendCategory {
  name: string;
  amount: number;
  priority: 'must' | 'wait' | null;
}

interface PlanningData {
  plannedAdvance: number;
  categories: SpendCategory[];
}

interface Installment {
  id: string;
  amount: number;
  purpose: string;
  date: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const VILLAGES = [
  'Akkalkot', 'Akluj', 'Barshi', 'Bhoom', 'Chakur', 'Dharur',
  'Gulbarga', 'Jejuri', 'Karad', 'Khatav', 'Kolhapur', 'Kopargaon',
  'Latur', 'Mangalwedha', 'Osmanabad', 'Pandharpur', 'Phaltan',
  'Sangola', 'Satara', 'Solapur', 'Walchandnagar', 'Wai', 'Other',
];

const TRAINING_ITEMS: { name: string; expert: 'must' | 'wait' }[] = [
  { name: 'Food', expert: 'must' },
  { name: 'Medicine', expert: 'must' },
  { name: 'Jewelry', expert: 'wait' },
  { name: 'Restaurant', expert: 'wait' },
  { name: 'School Fees', expert: 'must' },
  { name: 'Loan Payment', expert: 'must' },
  { name: 'New Table', expert: 'wait' },
  { name: 'Roof Repair', expert: 'must' },
];

const QUIZ_OPTIONS = [
  { id: 'goals', text: 'Review financial goals', correct: true },
  { id: 'income', text: 'Estimate amount of income', correct: true },
  { id: 'save', text: 'Decide how much to save', correct: true },
  { id: 'spend_all', text: 'Spend all money immediately', correct: false },
  { id: 'expenses', text: 'List all expenses', correct: true },
  { id: 'ignore', text: 'Ignore the budget later', correct: false },
  { id: 'balance', text: 'Ensure expenses are not more than income', correct: true },
];

const PURPOSE_OPTIONS = ['Food', 'Seeds', 'Health', 'Travel', 'School', 'Debt', 'Household', 'Other'];

const FLOW: Step[] = [
  'disclaimer', 'profile',
  'training-story', 'training-quiz', 'training-gauri', 'training-jagdish', 'training-prioritize',
  'recall-2024', 'recall-2025',
  'planning-advance', 'planning-categories', 'planning-priority-tag',
  'budget-pdf', 'transition', 'dashboard',
];

const STEP_LABELS: Record<Step, string> = {
  disclaimer: 'Welcome',
  profile: 'Your Profile',
  'training-story': 'Budgeting 101',
  'training-quiz': 'Budgeting Quiz',
  'training-gauri': "Gauri's Story",
  'training-jagdish': "Jagdish's Story",
  'training-prioritize': 'Prioritizing',
  'recall-2024': 'Past Season 2024',
  'recall-2025': 'Past Season 2025',
  'planning-advance': 'Advance Plan',
  'planning-categories': 'Priority Plan',
  'planning-priority-tag': 'Priority Plan',
  'budget-pdf': 'Budget Plan',
  transition: 'Ready to Track',
  dashboard: 'My Ledger',
  'add-installment': 'New Entry',
};

// ─── TTS ────────────────────────────────────────────────────────────────────────

const speakText = async (text: string) => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error('no key');
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: `Say clearly and slowly in a warm, helpful tone: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const b64 = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (b64) {
      const audio = new Audio(`data:audio/mp3;base64,${b64}`);
      audio.play();
    } else throw new Error('no audio');
  } catch {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.8;
    window.speechSynthesis.speak(u);
  }
};

// ─── Shared UI ─────────────────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'outline' | 'ghost' | 'amber';

const Btn = ({
  children, onClick, variant = 'primary', disabled = false, className = '', type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold text-sm transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none';
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-[#354A20] text-white hover:bg-[#2a3b19] shadow-sm',
    outline: 'border-2 border-[#354A20] text-[#354A20] hover:bg-[#354A20]/5',
    ghost: 'text-stone-500 hover:text-stone-700 hover:bg-stone-100',
    amber: 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl border border-stone-200 shadow-sm ${className}`}>{children}</div>
);

const SpeakBtn = ({ text }: { text: string }) => (
  <button
    onClick={() => speakText(text)}
    title="Listen"
    className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors"
  >
    <Volume2 size={16} />
  </button>
);

type BannerKind = 'learning' | 'planning' | 'history' | 'ready';

const SectionBanner = ({ kind }: { kind: BannerKind }) => {
  const cfg: Record<BannerKind, { grad: string; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
    learning: { grad: 'from-blue-500 to-indigo-600', label: 'Learning Module', Icon: BookOpen },
    planning: { grad: 'from-emerald-500 to-teal-600', label: 'Future Planning', Icon: TrendingUp },
    history: { grad: 'from-amber-400 to-orange-500', label: 'Season History', Icon: History },
    ready: { grad: 'from-purple-500 to-pink-500', label: 'Ready to Track', Icon: CheckCircle2 },
  };
  const { grad, label, Icon } = cfg[kind];
  return (
    <div className={`w-full h-28 bg-gradient-to-br ${grad} rounded-2xl flex items-center justify-center relative overflow-hidden`}>
      <div className="absolute -right-2 -bottom-2 opacity-15 scale-150 rotate-12"><Icon size={56} className="text-white" /></div>
      <div className="flex flex-col items-center gap-2 z-10">
        <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl"><Icon size={26} className="text-white" /></div>
        <span className="text-white/90 text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
    </div>
  );
};

const StepWrap = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -16 }}
    transition={{ duration: 0.22, ease: 'easeInOut' }}
    className="max-w-md mx-auto px-4 pt-5 pb-28 space-y-5"
  >
    {children}
  </motion.div>
);

const FLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">{children}</p>
);

const NInput = ({
  value, onChange, placeholder, large,
}: {
  value: number | string;
  onChange: (v: number) => void;
  placeholder?: string;
  large?: boolean;
}) => (
  <input
    type="number"
    value={value || ''}
    onChange={e => onChange(Number(e.target.value))}
    placeholder={placeholder ?? '0'}
    className={`w-full px-4 py-3 rounded-xl border-2 border-stone-100 bg-white focus:border-[#354A20] outline-none transition-colors font-semibold ${large ? 'text-4xl font-black text-[#354A20]' : 'text-base'}`}
  />
);

const ProgBar = ({ value, max }: { value: number; max: number }) => {
  const pct = Math.min((value / (max || 1)) * 100, 100);
  return (
    <div className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : 'bg-emerald-500'}`}
      />
    </div>
  );
};

const ExpertTip = ({ text }: { text?: string }) => (
  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
    <div className="flex gap-2.5 items-start">
      <Info size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide mb-1">Expert Tip</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          {text ?? 'Experts recommend prioritizing in this order: 1. Emergencies, 2. Debt payments, 3. Daily needs (Food, Medicine), 4. Future goals.'}
        </p>
      </div>
    </div>
  </div>
);

// ─── Screen: Disclaimer ────────────────────────────────────────────────────────

const DisclaimerStep = ({ onNext }: { onNext: () => void }) => (
  <StepWrap>
    <div className="text-center py-4 space-y-3">
      <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto">
        <Info size={26} className="text-emerald-600" />
      </div>
      <h1 className="font-serif text-3xl font-bold text-stone-900">Welcome</h1>
      <p className="text-stone-500 text-sm leading-relaxed">Please read these important notes before we begin.</p>
    </div>

    <Card className="p-5 border-l-4 border-l-emerald-500 space-y-5">
      <div className="flex gap-3">
        <CheckCircle2 size={17} className="text-emerald-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-stone-600 leading-relaxed">
          <strong className="text-stone-800">Research Study:</strong> We are inviting you to use this app over the next few months as part of a research initiative with SOPPECOM being led by Professor Eliana La Ferrara and Aditi Bhowmick, at Harvard University. The purpose of the research is to develop and assess tools that can potentially improve the financial well-being of sugarcane cutters in Maharashtra. Any information you provide on the app will only be available to the researchers mentioned for analysis purposes only. All of your data provided on the app will be deleted from app storage by the end of the agricultural cycle (i.e. April 2027).
          <br /><br />
          Please feel free to contact xyz at xyz if you have any questions.
        </p>
      </div>
      <div className="border-t border-stone-100 pt-4 flex gap-3">
        <CheckCircle2 size={17} className="text-emerald-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-stone-600 leading-relaxed">
          <strong className="text-stone-800">Not Financial Advice:</strong> This is a tool to help you track debt and plan. It does not give professional financial advice or tell you what to do.
        </p>
      </div>
    </Card>

    <Btn onClick={onNext} className="w-full py-4 text-base">
      I Understand &amp; Agree <ArrowRight size={18} />
    </Btn>
  </StepWrap>
);

// ─── Screen: Profile ───────────────────────────────────────────────────────────

const ProfileStep = ({
  profile, setProfile, onNext,
}: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  onNext: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const canContinue = profile.firstName.trim() && profile.village;

  return (
    <StepWrap>
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Your Profile</h2>
        <p className="text-sm text-stone-500 mt-1">Let&apos;s start with your basic info.</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FLabel>First Name</FLabel>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={profile.firstName}
                onChange={e => setProfile(p => ({ ...p, firstName: e.target.value }))}
                placeholder="First name"
                className="w-full pl-8 pr-3 py-3 rounded-xl border-2 border-stone-100 focus:border-[#354A20] outline-none text-sm transition-colors"
              />
            </div>
          </div>
          <div>
            <FLabel>Last Name</FLabel>
            <input
              type="text"
              value={profile.lastName}
              onChange={e => setProfile(p => ({ ...p, lastName: e.target.value }))}
              placeholder="Last name"
              className="w-full px-3 py-3 rounded-xl border-2 border-stone-100 focus:border-[#354A20] outline-none text-sm transition-colors"
            />
          </div>
        </div>

        <div className="relative">
          <FLabel>Village / Location</FLabel>
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full px-4 py-3 rounded-xl border-2 border-stone-100 bg-white text-left flex items-center gap-2 focus:border-[#354A20] transition-colors"
          >
            <MapPin size={14} className="text-stone-400 flex-shrink-0" />
            <span className={`flex-1 text-sm ${profile.village ? 'text-stone-800' : 'text-stone-400'}`}>
              {profile.village || 'Select your village'}
            </span>
            <ChevronDown size={15} className={`text-stone-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-52 overflow-y-auto"
              >
                {VILLAGES.map(v => (
                  <button
                    key={v}
                    onClick={() => { setProfile(p => ({ ...p, village: v })); setOpen(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors
                      ${profile.village === v ? 'bg-emerald-50 text-[#354A20] font-semibold' : 'text-stone-700 hover:bg-stone-50'}`}
                  >
                    {v}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      <Btn onClick={onNext} disabled={!canContinue} className="w-full py-4 text-base">
        Continue <ArrowRight size={18} />
      </Btn>
    </StepWrap>
  );
};

// ─── Screen: Geeta Tai's Story ─────────────────────────────────────────────────

const GEETA_STORY = `Geeta Tai does not read and write very well, but she still knows how to make a budget. She remembers the family's goals for the future and how much it will cost to reach them. She thinks about the family situation. She asks herself, 'What is happening in this family that will bring in money and what requires us to spend money for the next month?' She thinks about how much money is coming into the house weekly or monthly from the farm, business and other sources. Then she decides how much she would like to save this month. She thinks about how much they will need to spend during the same period. She asks a family member to write down what she thinks her income and spending will be in the next month or more. Then Geeta Tai checks to be sure she does not plan to spend more than the income she will receive. If her plan shows that she would spend more than her income, she looks which items she can reduce on. If her plan shows that there will be something left over at the end of the month, she can add it to the savings. She follows the income and spending closely over time to compare her plan with what really happens. She changes her estimates for the next month based on what she learns.`;

const BUDGET_STEPS = [
  'Set financial goals',
  'Estimate amount of income',
  'Decide how much to save',
  'List all expenses',
  'Ensure expenses are not more than income',
  'Follow the budget',
];

const TrainingStoryStep = ({ onNext }: { onNext: () => void }) => (
  <StepWrap>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">Budgeting 101</p>
        <h2 className="font-serif italic text-2xl text-stone-800 mt-0.5">Geeta Tai&apos;s Story</h2>
      </div>
      <SpeakBtn text={GEETA_STORY} />
    </div>

    <Card className="overflow-hidden">
      <SectionBanner kind="learning" />
      <div className="p-5 space-y-4">
        <p className="text-sm text-stone-600 leading-relaxed italic">&quot;{GEETA_STORY}&quot;</p>
        <div className="border-t border-stone-100 pt-4 space-y-2.5">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Steps to Make a Budget</p>
          {BUDGET_STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-stone-700">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0">{i + 1}</span>
              {s}
            </div>
          ))}
        </div>
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 font-medium">
          Geeta Tai knows how to plan for her family&apos;s future, even without reading or writing.
        </div>
      </div>
    </Card>

    <Btn onClick={onNext} className="w-full">Next: Quiz <ArrowRight size={18} /></Btn>
  </StepWrap>
);

// ─── Screen: Budget Quiz ───────────────────────────────────────────────────────

const TrainingQuizStep = ({ onNext }: { onNext: () => void }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const q = 'What does Geeta Tai do to make a budget? Select all the correct steps she takes.';

  const toggle = (id: string) => {
    if (checked) return;
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const score = checked ? selected.filter(id => QUIZ_OPTIONS.find(o => o.id === id)?.correct).length : 0;
  const total = QUIZ_OPTIONS.filter(o => o.correct).length;

  return (
    <StepWrap>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">Budgeting Quiz</p>
          <h2 className="font-serif italic text-2xl text-stone-800 mt-0.5">Budget Quiz</h2>
        </div>
        <SpeakBtn text={q} />
      </div>

      <p className="text-sm text-stone-500">{q}</p>

      {!checked ? (
        <>
          <div className="space-y-2">
            {QUIZ_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => toggle(opt.id)}
                className={`w-full px-4 py-3.5 rounded-xl border-2 text-left text-sm font-medium flex items-center justify-between transition-all
                  ${selected.includes(opt.id)
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-stone-100 bg-white text-stone-600 hover:border-stone-300'}`}
              >
                {opt.text}
                {selected.includes(opt.id) && <CheckCircle2 size={17} className="text-emerald-500 ml-2 flex-shrink-0" />}
              </button>
            ))}
          </div>
          <Btn onClick={() => setChecked(true)} disabled={selected.length === 0} className="w-full">
            Check Answers <ArrowRight size={18} />
          </Btn>
        </>
      ) : (
        <Card className="p-5 space-y-5">
          <div className="text-center space-y-1">
            <p className="text-6xl font-black text-[#354A20]">
              {score}<span className="text-stone-300 text-4xl font-light"> / {total}</span>
            </p>
            <p className="text-stone-400 text-sm font-medium">Your Score</p>
          </div>
          <div className="space-y-2">
            {QUIZ_OPTIONS.map(opt => {
              const sel = selected.includes(opt.id);
              const ok = opt.correct;
              let cls = 'bg-stone-50 border-stone-100 text-stone-400';
              let icon: React.ReactNode = null;
              if (sel && ok) { cls = 'bg-emerald-50 border-emerald-200 text-emerald-700'; icon = <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />; }
              else if (sel && !ok) { cls = 'bg-rose-50 border-rose-200 text-rose-700'; icon = <AlertTriangle size={16} className="text-rose-500 flex-shrink-0" />; }
              else if (!sel && ok) { cls = 'bg-amber-50 border-amber-200 text-amber-700'; icon = <Info size={16} className="text-amber-500 flex-shrink-0" />; }
              return (
                <div key={opt.id} className={`px-4 py-3 rounded-xl border-2 flex items-center justify-between text-sm font-medium gap-2 ${cls}`}>
                  <span>{opt.text}</span>{icon}
                </div>
              );
            })}
          </div>
          <Btn onClick={onNext} className="w-full">Continue <ArrowRight size={18} /></Btn>
        </Card>
      )}
    </StepWrap>
  );
};

// ─── Screen: Stories (Gauri & Jagdish) ────────────────────────────────────────

interface StoryMeta {
  eyebrow: string;
  heading: string;
  title: string;
  text: string;
  lesson: string;
  cta: string;
}

const StoryStep = ({ meta, onNext }: { meta: StoryMeta; onNext: () => void }) => (
  <StepWrap>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">{meta.eyebrow}</p>
        <h2 className="font-serif italic text-2xl text-blue-900 mt-0.5">{meta.heading}</h2>
      </div>
      <SpeakBtn text={meta.text} />
    </div>

    <Card className="overflow-hidden">
      <SectionBanner kind="learning" />
      <div className="p-5 space-y-4">
        <h3 className="font-bold text-stone-800">{meta.title}</h3>
        <p className="text-sm text-stone-600 leading-relaxed italic">&quot;{meta.text}&quot;</p>
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-xs font-bold text-blue-800">Key Lesson: {meta.lesson}</p>
        </div>
      </div>
    </Card>

    <Btn onClick={onNext} className="w-full">{meta.cta} <ArrowRight size={18} /></Btn>
  </StepWrap>
);

const GAURI: StoryMeta = {
  eyebrow: "Gauri's Story",
  heading: 'Staying on Track (1/2)',
  title: "Gauri's Story",
  text: "Gauri made a budget with her family. At the market, a friend offered her beautiful cloth. Gauri was tempted but remembered her budget had no money for it. She was glad her savings were in the bank and not easy to reach. Later, her stove broke, and she used the 'emergency fund' she had set aside to buy a new one.",
  lesson: 'Keep savings out of reach and set aside money for unexpected expenses.',
  cta: "Next: Jagdish's Story",
};

const JAGDISH: StoryMeta = {
  eyebrow: "Jagdish's Story",
  heading: 'Staying on Track (2/2)',
  title: "Jagdish's Story",
  text: 'During the festival season, Jagdish planned for extra expenses. He tracked his spending weekly. When he realized he spent too much on gifts, he looked at his budget and decided to spend less on a new shirt he wanted, to make up for the overspending.',
  lesson: 'Track spending regularly. If you overspend on one thing, spend less on another.',
  cta: 'Next: Prioritizing',
};

// ─── Screen: Training Prioritize ──────────────────────────────────────────────

const TrainingPrioritizeStep = ({ onNext }: { onNext: () => void }) => {
  const [choices, setChoices] = useState<Record<string, 'must' | 'wait' | null>>(
    Object.fromEntries(TRAINING_ITEMS.map(i => [i.name, null]))
  );
  const allDone = Object.values(choices).every(v => v !== null);
  const done = Object.values(choices).filter(v => v !== null).length;
  const q = "Help Geeta Tai prioritize her expenses. Which of these are 'Must Have' right now, and which can 'Wait for Later'?";

  return (
    <StepWrap>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">Prioritizing</p>
          <h2 className="font-serif italic text-2xl text-amber-900 mt-0.5">Prioritizing</h2>
        </div>
        <SpeakBtn text={q} />
      </div>

      <p className="text-sm text-stone-500">{q}</p>

      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-stone-400">Progress</span>
        <span className="text-xs font-bold text-[#354A20]">{done} / {TRAINING_ITEMS.length} items</span>
      </div>

      <div className="space-y-2.5">
        {TRAINING_ITEMS.map(item => (
          <div key={item.name} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-stone-200">
            <span className="font-semibold text-stone-700 text-sm">{item.name}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setChoices(c => ({ ...c, [item.name]: 'must' }))}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all
                  ${choices[item.name] === 'must' ? 'bg-[#354A20] text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}
              >Must Have</button>
              <button
                onClick={() => setChoices(c => ({ ...c, [item.name]: 'wait' }))}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all
                  ${choices[item.name] === 'wait' ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}
              >Can Wait</button>
            </div>
          </div>
        ))}
      </div>

      <ExpertTip />

      <Btn onClick={onNext} disabled={!allDone} className="w-full">
        Continue <ArrowRight size={18} />
      </Btn>
    </StepWrap>
  );
};

// ─── Screen: Recall (Past Season) ─────────────────────────────────────────────

const RecallStep = ({
  year, recall, setRecall, onNext,
}: {
  year: string;
  recall: YearRecall;
  setRecall: React.Dispatch<React.SetStateAction<YearRecall>>;
  onNext: () => void;
}) => {
  const q = `Think back to the ${year} season. How much advance did you start with, how much did you take, how many months did you work, and what was left over?`;
  const fields: { label: string; key: keyof YearRecall }[] = [
    { label: `Advance pending at start (₹)`, key: 'pendingStart' },
    { label: `Total advance taken in ${year} (₹)`, key: 'advanceTaken' },
    { label: 'Months Worked', key: 'monthsWorked' },
    { label: 'Arrears Remaining (₹)', key: 'arrearsRemaining' },
  ];

  return (
    <StepWrap>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">Season History</p>
          <h2 className="font-serif italic text-2xl text-amber-900 mt-0.5">Past Season {year}</h2>
        </div>
        <SpeakBtn text={q} />
      </div>
      <SectionBanner kind="history" />
      <Card className="p-5 space-y-4">
        {fields.map(f => (
          <div key={f.key}>
            <FLabel>{f.label}</FLabel>
            <NInput value={recall[f.key] || ''} onChange={v => setRecall(r => ({ ...r, [f.key]: v }))} />
          </div>
        ))}
      </Card>
      <Btn onClick={onNext} className="w-full">Save &amp; Continue <ArrowRight size={18} /></Btn>
    </StepWrap>
  );
};

// ─── Screen: Planning — Advance Amount ────────────────────────────────────────

const PlanningAdvanceStep = ({
  planning, setPlanning, onNext, estMonths, estMonthsWithArrears, arrears,
}: {
  planning: PlanningData;
  setPlanning: React.Dispatch<React.SetStateAction<PlanningData>>;
  onNext: () => void;
  estMonths: number;
  estMonthsWithArrears: number;
  arrears: number;
}) => {
  const q = 'What is your planned advance amount as a koyta for this season?';
  const showEst = planning.plannedAdvance > 0;

  return (
    <StepWrap>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">Advance Plan</p>
          <h2 className="font-serif italic text-2xl text-emerald-800 mt-0.5">Advance Plan 2026</h2>
        </div>
        <SpeakBtn text={q} />
      </div>
      <SectionBanner kind="planning" />
      <Card className="p-5 space-y-4">
        <div>
          <FLabel>Planned Advance Amount (₹)</FLabel>
          <NInput value={planning.plannedAdvance || ''} onChange={v => setPlanning(p => ({ ...p, plannedAdvance: v }))} large />
        </div>
        <AnimatePresence>
          {showEst && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-emerald-200">
                  <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                    Broad estimate — based on your last two seasons&apos; data only
                  </p>
                </div>
                <p className="text-sm text-emerald-900 leading-relaxed">
                  <strong>Repayment time:</strong> About{' '}
                  <span className="text-xl font-black">{estMonths}</span>{' '}
                  <span className="font-bold">months</span> to pay off ₹{planning.plannedAdvance.toLocaleString()}.
                </p>
                {arrears > 0 && (
                  <p className="text-sm text-emerald-900 leading-relaxed border-t border-emerald-200 pt-3">
                    <strong>Including arrears:</strong> With ₹{arrears.toLocaleString()} in arrears, total repayment is about{' '}
                    <span className="text-xl font-black">{estMonthsWithArrears}</span>{' '}
                    <span className="font-bold">months</span>.
                  </p>
                )}
                <p className="text-[10px] text-emerald-600 leading-relaxed">
                  Actual repayment depends on your work days, wages, deductions, and other factors.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      <Btn onClick={onNext} disabled={!planning.plannedAdvance} className="w-full py-4">
        Continue <ArrowRight size={18} />
      </Btn>
    </StepWrap>
  );
};

// ─── Screen: Planning — List Categories (Stage 1) ─────────────────────────────

const PlanningCategoriesStep = ({
  planning, setPlanning, onNext,
}: {
  planning: PlanningData;
  setPlanning: React.Dispatch<React.SetStateAction<PlanningData>>;
  onNext: () => void;
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const total = planning.categories.reduce((s, c) => s + c.amount, 0);
  const q = 'What are the main things your family plans to spend the advance on this season? Add up to 10 categories.';

  const add = () => {
    const n = name.trim();
    const a = Number(amount);
    if (!n || !a || planning.categories.length >= 10) return;
    setPlanning(p => ({ ...p, categories: [...p.categories, { name: n, amount: a, priority: null }] }));
    setName('');
    setAmount('');
  };

  const remove = (i: number) =>
    setPlanning(p => ({ ...p, categories: p.categories.filter((_, idx) => idx !== i) }));

  return (
    <StepWrap>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">Priority Plan — Step 1 of 2</p>
          <h2 className="font-serif italic text-2xl text-emerald-800 mt-0.5">What will you spend on?</h2>
        </div>
        <SpeakBtn text={q} />
      </div>
      <SectionBanner kind="planning" />
      <p className="text-sm text-stone-500">{q}</p>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Your Categories</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${planning.categories.length >= 10 ? 'bg-rose-100 text-rose-600' : 'bg-stone-100 text-stone-400'}`}>
            {planning.categories.length} / 10
          </span>
        </div>

        {planning.categories.length > 0 && (
          <div className="space-y-2">
            {planning.categories.map((cat, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                <span className="font-semibold text-stone-700 text-sm">{cat.name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#354A20] text-sm">₹{cat.amount.toLocaleString()}</span>
                  <button onClick={() => remove(i)} className="text-stone-300 hover:text-rose-400 transition-colors p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {planning.categories.length < 10 && (
          <div className="border-t border-stone-100 pt-4 space-y-2">
            <div className="grid grid-cols-5 gap-2">
              <input
                type="text"
                placeholder="Category name"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && add()}
                className="col-span-3 px-3 py-2.5 rounded-xl border-2 border-stone-100 focus:border-[#354A20] text-sm outline-none transition-colors"
              />
              <input
                type="number"
                placeholder="₹ Amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && add()}
                className="col-span-2 px-3 py-2.5 rounded-xl border-2 border-stone-100 focus:border-[#354A20] text-sm outline-none transition-colors"
              />
            </div>
            <Btn onClick={add} variant="outline" disabled={!name.trim() || !amount} className="w-full py-2.5 text-xs">
              <PlusCircle size={15} /> Add Category
            </Btn>
          </div>
        )}
      </Card>

      {total > 0 && (
        <div className="flex items-center justify-between px-5 py-4 bg-[#354A20] text-white rounded-2xl">
          <span className="text-sm font-medium opacity-80">Total Planned</span>
          <span className="text-2xl font-black">₹{total.toLocaleString()}</span>
        </div>
      )}

      <Btn onClick={onNext} disabled={planning.categories.length === 0} className="w-full py-4">
        Next: Prioritize These <ArrowRight size={18} />
      </Btn>
    </StepWrap>
  );
};

// ─── Screen: Planning — Must Have / Can Wait (Stage 2) ────────────────────────

const PlanningPriorityTagStep = ({
  planning, setPlanning, onNext,
}: {
  planning: PlanningData;
  setPlanning: React.Dispatch<React.SetStateAction<PlanningData>>;
  onNext: () => void;
}) => {
  const tag = (i: number, t: 'must' | 'wait') => {
    setPlanning(p => {
      const cats = [...p.categories];
      cats[i] = { ...cats[i], priority: t };
      return { ...p, categories: cats };
    });
  };
  const allTagged = planning.categories.every(c => c.priority !== null);
  const mustTotal = planning.categories.filter(c => c.priority === 'must').reduce((s, c) => s + c.amount, 0);
  const q = "For each category, decide: is this a 'Must Have' right now, or can it 'Wait'?";

  return (
    <StepWrap>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">Priority Plan — Step 2 of 2</p>
          <h2 className="font-serif italic text-2xl text-emerald-800 mt-0.5">Must Have or Can Wait?</h2>
        </div>
        <SpeakBtn text={q} />
      </div>
      <p className="text-sm text-stone-500">{q}</p>
      <ExpertTip />

      <div className="space-y-2.5">
        {planning.categories.map((cat, i) => (
          <div key={i} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-stone-200 shadow-sm">
            <div>
              <p className="font-semibold text-stone-800 text-sm">{cat.name}</p>
              <p className="text-xs text-stone-400 mt-0.5">₹{cat.amount.toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => tag(i, 'must')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all
                  ${cat.priority === 'must' ? 'bg-[#354A20] text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}
              >Must Have</button>
              <button
                onClick={() => tag(i, 'wait')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all
                  ${cat.priority === 'wait' ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}
              >Can Wait</button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {mustTotal > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-5 bg-[#354A20] text-white rounded-2xl space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-60">Your Priority Advance Amount</p>
            <p className="text-4xl font-black">₹{mustTotal.toLocaleString()}</p>
            <p className="text-xs opacity-70 leading-relaxed">
              Consider taking this as your initial advance. Take more only if truly needed later in the season.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <Btn onClick={onNext} disabled={!allTagged} className="w-full py-4">
        See My Budget Plan <ArrowRight size={18} />
      </Btn>
    </StepWrap>
  );
};

// ─── Screen: Budget PDF ────────────────────────────────────────────────────────

const BudgetPDFStep = ({
  profile, planning, onNext,
}: {
  profile: Profile;
  planning: PlanningData;
  onNext: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  const mustHave = planning.categories.filter(c => c.priority === 'must');
  const canWait = planning.categories.filter(c => c.priority === 'wait');
  const mustTotal = mustHave.reduce((s, c) => s + c.amount, 0);
  const canWaitTotal = canWait.reduce((s, c) => s + c.amount, 0);
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const downloadPDF = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: '#F5F0E8' });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, 'PNG', 0, 0, w, h);
      pdf.save(`Koyta-Sathi-Budget-${fullName || 'Plan'}-2026.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <StepWrap>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">Your Budget Plan</p>
          <h2 className="font-serif italic text-2xl text-emerald-800 mt-0.5">Budget Plan 2026</h2>
        </div>
        <Btn onClick={downloadPDF} variant="outline" disabled={busy} className="px-4 py-2 text-xs gap-1.5">
          <Download size={14} /> {busy ? 'Saving…' : 'Save PDF'}
        </Btn>
      </div>

      <p className="text-xs text-stone-400 leading-relaxed">
        This plan can be printed and kept as a guide for the season ahead.
      </p>

      <div ref={ref} className="rounded-2xl overflow-hidden border border-stone-200 bg-[#F5F0E8]">
        <div className="bg-[#354A20] text-white px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-serif italic text-2xl font-bold leading-tight">Koyta-Sathi</h1>
              <p className="text-emerald-300 text-[10px] mt-0.5 uppercase tracking-widest font-medium">Season Budget Plan 2026</p>
            </div>
            <div className="text-right">
              <p className="font-bold">{fullName}</p>
              <p className="text-emerald-300 text-xs mt-0.5">{profile.village}</p>
              <p className="text-emerald-400 text-[10px] mt-1">{today}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 border border-stone-200">
              <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Total Planned Advance</p>
              <p className="text-2xl font-black text-stone-900 mt-1">₹{planning.plannedAdvance.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-stone-200">
              <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Priority Amount</p>
              <p className="text-2xl font-black text-[#354A20] mt-1">₹{mustTotal.toLocaleString()}</p>
            </div>
          </div>

          {mustHave.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#354A20]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#354A20]">Must Have — ₹{mustTotal.toLocaleString()}</span>
              </div>
              <div className="space-y-1.5">
                {mustHave.map((c, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-stone-100">
                    <span className="text-sm font-medium text-stone-700">{c.name}</span>
                    <span className="text-sm font-bold text-stone-900">₹{c.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canWait.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Can Wait — ₹{canWaitTotal.toLocaleString()}</span>
              </div>
              <div className="space-y-1.5 opacity-60">
                {canWait.map((c, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-stone-100">
                    <span className="text-sm font-medium text-stone-700">{c.name}</span>
                    <span className="text-sm font-bold text-stone-500">₹{c.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <p className="text-xs text-emerald-800 leading-relaxed">
              <strong>Your plan:</strong> Try to take only the &apos;Must Have&apos; amount initially from your mukaddam. Take more only if truly needed. Track every installment in the Koyta-Sathi app.
            </p>
          </div>

          <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-200">
            <span>Koyta-Sathi — Harvard University / SOPPECOM</span>
            <span>Data deleted April 2027</span>
          </div>
        </div>
      </div>

      <Btn onClick={onNext} className="w-full py-4 text-base">
        Go to Ledger <ArrowRight size={18} />
      </Btn>
    </StepWrap>
  );
};

// ─── Screen: Transition ────────────────────────────────────────────────────────

const TransitionStep = ({ profile, onNext }: { profile: Profile; onNext: () => void }) => {
  const firstName = profile.firstName || 'Friend';
  const text = `Now that you have planned your advance for the season and created your budget plan, let's move to the tracking stage to record your advances from the mukaddam, ${firstName}.`;
  return (
    <StepWrap>
      <div className="text-center space-y-5 py-4">
        <div className="w-20 h-20 bg-emerald-100 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={36} className="text-emerald-600" />
        </div>
        <SectionBanner kind="ready" />
        <div>
          <h2 className="font-serif text-3xl font-bold text-stone-900">Ready to Track!</h2>
          <p className="text-stone-500 text-sm leading-relaxed mt-2 max-w-xs mx-auto">{text}</p>
        </div>
        <div className="flex justify-center"><SpeakBtn text={text} /></div>
      </div>
      <Btn onClick={onNext} className="w-full py-4 text-base">Go to Ledger <ArrowRight size={18} /></Btn>
    </StepWrap>
  );
};

// ─── Screen: Dashboard ─────────────────────────────────────────────────────────

const DashboardStep = ({
  profile, planning, installments, onAddNew,
}: {
  profile: Profile;
  planning: PlanningData;
  installments: Installment[];
  onAddNew: () => void;
}) => {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  const mustTotal = planning.categories.filter(c => c.priority === 'must').reduce((s, c) => s + c.amount, 0);
  const limit = mustTotal || planning.plannedAdvance || 0;
  const totalDebt = installments.reduce((s, i) => s + i.amount, 0);
  const pct = limit > 0 ? (totalDebt / limit) * 100 : 0;
  const remaining = Math.max(0, limit - totalDebt);
  const isWarn = pct >= 90;
  const intro = `Hello ${fullName}. You will log every advance you take from your mukaddam in this ledger. Your priority goal is ₹${limit.toLocaleString()}.`;

  return (
    <div className="max-w-md mx-auto px-4 pt-5 pb-28 space-y-5">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-serif italic text-xl font-bold text-stone-900">{fullName ? `Hello, ${fullName}` : 'My Ledger'}</h1>
          <p className="text-sm text-stone-400 mt-0.5">{profile.village}</p>
        </div>
        <div className="flex items-center gap-2">
          <SpeakBtn text={intro} />
          <div className="w-10 h-10 bg-[#354A20] rounded-full flex items-center justify-center text-white font-bold text-sm">
            {(profile.firstName?.[0] || 'K').toUpperCase()}
          </div>
        </div>
      </header>

      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
        <p className="text-xs text-emerald-800 leading-relaxed">{intro}</p>
      </div>

      <Card className="p-5 space-y-4 border-t-4 border-t-[#354A20]">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">Total Debt So Far</p>
            <h2 className="text-4xl font-black text-stone-900 mt-1">₹{totalDebt.toLocaleString()}</h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-400">Priority Goal: ₹{limit.toLocaleString()}</p>
            <p className={`text-xl font-black mt-0.5 ${isWarn ? 'text-rose-500' : 'text-emerald-500'}`}>{Math.round(pct)}%</p>
          </div>
        </div>
        <ProgBar value={totalDebt} max={limit} />
        {isWarn && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
            <AlertTriangle size={16} className="flex-shrink-0" /> Warning! You are near your priority limit.
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
            <Target size={18} className="text-blue-600" />
          </div>
          <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Priority Goal</p>
          <p className="text-xl font-black text-stone-900">₹{limit.toLocaleString()}</p>
        </Card>
        <Card className="p-4 flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
            <Wallet size={18} className="text-amber-600" />
          </div>
          <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Remaining</p>
          <p className="text-xl font-black text-stone-900">₹{remaining.toLocaleString()}</p>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif italic text-lg font-bold text-stone-800">Advance Ledger</h3>
          <button onClick={onAddNew} className="flex items-center gap-1.5 text-[#354A20] text-sm font-bold hover:underline">
            <PlusCircle size={15} /> Add New
          </button>
        </div>

        {installments.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50">
            <Wallet size={32} className="text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 text-sm font-medium">No installments logged yet</p>
            <button onClick={onAddNew} className="mt-2 text-[#354A20] text-sm font-semibold hover:underline">
              + Log your first installment
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {installments.map(inst => (
              <div key={inst.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-stone-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Wallet size={17} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-stone-800 text-sm">{inst.purpose}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{inst.date}</p>
                  </div>
                </div>
                <p className="font-black text-stone-900">₹{inst.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Screen: Add Installment ───────────────────────────────────────────────────

const AddInstallmentStep = ({
  installments, setInstallments, onBack,
}: {
  installments: Installment[];
  setInstallments: React.Dispatch<React.SetStateAction<Installment[]>>;
  onBack: () => void;
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [date, setDate] = useState(today);

  const save = () => {
    if (!amount || !purpose || !date) return;
    const d = new Date(date + 'T00:00:00');
    const displayDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    setInstallments(prev => [
      { id: crypto.randomUUID(), amount: Number(amount), purpose, date: displayDate },
      ...prev,
    ]);
    onBack();
  };

  return (
    <StepWrap>
      <div className="flex items-center justify-between">
        <h2 className="font-serif italic text-2xl font-bold text-stone-900">New Installment</h2>
        <button onClick={onBack} className="text-stone-400 text-sm font-semibold hover:text-stone-600 transition-colors">Cancel</button>
      </div>

      <Card className="p-5 space-y-5">
        <div className="text-center space-y-1 py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Amount (₹)</p>
          <input
            type="number"
            autoFocus
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            className="w-full text-6xl font-black text-center text-[#354A20] outline-none bg-transparent"
          />
        </div>

        <div className="border-t border-stone-100 pt-4">
          <FLabel>Date of Installment</FLabel>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-xl border-2 border-stone-100 focus:border-[#354A20] outline-none text-sm font-semibold transition-colors"
            />
          </div>
          <p className="text-[10px] text-stone-400 mt-1.5">
            You can log past installments too — enter the actual date it was received.
          </p>
        </div>

        <div className="border-t border-stone-100 pt-4 space-y-3">
          <FLabel>What is this for?</FLabel>
          <div className="grid grid-cols-4 gap-2">
            {PURPOSE_OPTIONS.map(p => (
              <button
                key={p}
                onClick={() => setPurpose(p)}
                className={`py-2 px-1 rounded-xl text-xs font-semibold border-2 transition-all
                  ${purpose === p ? 'border-[#354A20] bg-[#354A20]/5 text-[#354A20]' : 'border-stone-100 text-stone-500 bg-white hover:border-stone-200'}`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Or describe the purpose…"
            value={PURPOSE_OPTIONS.includes(purpose) ? '' : purpose}
            onChange={e => setPurpose(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border-2 border-stone-100 focus:border-[#354A20] outline-none text-sm transition-colors"
          />
        </div>
      </Card>

      <Btn onClick={save} disabled={!amount || !purpose || !date} className="w-full py-4 text-base">
        Log Installment <CheckCircle2 size={18} />
      </Btn>
    </StepWrap>
  );
};

// ─── Root Component ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'koyta_sathi_v2';

export default function KoytaSathiApp() {
  const [step, setStep] = useState<Step>('disclaimer');
  const [history, setHistory] = useState<Step[]>([]);
  const [profile, setProfile] = useState<Profile>({ firstName: '', lastName: '', village: '' });
  const [recall2024, setRecall2024] = useState<YearRecall>({ pendingStart: 0, advanceTaken: 0, monthsWorked: 0, arrearsRemaining: 0 });
  const [recall2025, setRecall2025] = useState<YearRecall>({ pendingStart: 0, advanceTaken: 0, monthsWorked: 0, arrearsRemaining: 0 });
  const [planning, setPlanning] = useState<PlanningData>({ plannedAdvance: 0, categories: [] });
  const [installments, setInstallments] = useState<Installment[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.profile) setProfile(d.profile);
        if (d.recall2024) setRecall2024(d.recall2024);
        if (d.recall2025) setRecall2025(d.recall2025);
        if (d.planning) setPlanning(d.planning);
        if (d.installments) setInstallments(d.installments);
        if (d.step && d.step !== 'disclaimer') setStep(d.step);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, recall2024, recall2025, planning, installments, step }));
    } catch { /* ignore */ }
  }, [profile, recall2024, recall2025, planning, installments, step]);

  const avg2024 = recall2024.monthsWorked > 0 ? recall2024.advanceTaken / recall2024.monthsWorked : 0;
  const avg2025 = recall2025.monthsWorked > 0 ? recall2025.advanceTaken / recall2025.monthsWorked : 0;
  const avgPerMonth = ((avg2024 + avg2025) / (avg2024 > 0 && avg2025 > 0 ? 2 : 1)) || 8000;
  const arrears = recall2025.arrearsRemaining;
  const estMonths = planning.plannedAdvance > 0 ? Math.ceil(planning.plannedAdvance / avgPerMonth) : 0;
  const estMonthsWithArrears = (planning.plannedAdvance + arrears) > 0 ? Math.ceil((planning.plannedAdvance + arrears) / avgPerMonth) : 0;

  const go = useCallback((next: Step) => {
    setHistory(h => [...h, step]);
    setStep(next);
  }, [step]);

  const back = useCallback(() => {
    if (history.length === 0) return;
    setStep(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
  }, [history]);

  const next = useCallback(() => {
    const idx = FLOW.indexOf(step);
    if (idx >= 0 && idx < FLOW.length - 1) go(FLOW[idx + 1]);
  }, [step, go]);

  const canBack = history.length > 0 && step !== 'dashboard';

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-stone-900 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-[#F5F0E8]/90 backdrop-blur-md border-b border-stone-200/70">
        {canBack ? (
          <button
            onClick={back}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        ) : <div className="w-9" />}
        <div className="text-center">
          <p className="font-serif italic text-lg text-stone-800 leading-tight">Koyta-Sathi</p>
          <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">{STEP_LABELS[step]}</p>
        </div>
        <div className="w-9" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'disclaimer' && <DisclaimerStep key="disclaimer" onNext={next} />}
        {step === 'profile' && <ProfileStep key="profile" profile={profile} setProfile={setProfile} onNext={next} />}
        {step === 'training-story' && <TrainingStoryStep key="t-story" onNext={next} />}
        {step === 'training-quiz' && <TrainingQuizStep key="t-quiz" onNext={next} />}
        {step === 'training-gauri' && <StoryStep key="t-gauri" meta={GAURI} onNext={next} />}
        {step === 'training-jagdish' && <StoryStep key="t-jagdish" meta={JAGDISH} onNext={next} />}
        {step === 'training-prioritize' && <TrainingPrioritizeStep key="t-prio" onNext={next} />}
        {step === 'recall-2024' && <RecallStep key="r-2024" year="2024" recall={recall2024} setRecall={setRecall2024} onNext={next} />}
        {step === 'recall-2025' && <RecallStep key="r-2025" year="2025" recall={recall2025} setRecall={setRecall2025} onNext={next} />}
        {step === 'planning-advance' && (
          <PlanningAdvanceStep key="p-adv" planning={planning} setPlanning={setPlanning} onNext={next} estMonths={estMonths} estMonthsWithArrears={estMonthsWithArrears} arrears={arrears} />
        )}
        {step === 'planning-categories' && (
          <PlanningCategoriesStep key="p-cat" planning={planning} setPlanning={setPlanning} onNext={next} />
        )}
        {step === 'planning-priority-tag' && (
          <PlanningPriorityTagStep key="p-tag" planning={planning} setPlanning={setPlanning} onNext={next} />
        )}
        {step === 'budget-pdf' && <BudgetPDFStep key="b-pdf" profile={profile} planning={planning} onNext={next} />}
        {step === 'transition' && <TransitionStep key="transition" profile={profile} onNext={next} />}
        {step === 'dashboard' && (
          <DashboardStep key="dashboard" profile={profile} planning={planning} installments={installments} onAddNew={() => go('add-installment')} />
        )}
        {step === 'add-installment' && (
          <AddInstallmentStep key="add" installments={installments} setInstallments={setInstallments} onBack={() => go('dashboard')} />
        )}
      </AnimatePresence>
    </div>
  );
}

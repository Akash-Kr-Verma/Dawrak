// src/components/modules/ModuleRunner.tsx
//
// Orchestrates one module end to end:
//   content warning → stage → judgement → grading → feedback → canonical
//   reasoning → reveal
//
// The stage varies by format (three engines); everything around it is shared.
"use client";

import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ShieldAlert,
  BookOpen,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  fillTokensDeep,
  resolvePack,
  type LanguagePackId,
} from "@/content/languagePacks";
import type {
  GradeResult,
  LearnerVerdict,
  ModuleReveal,
  ModuleSignal,
  RunnableModule,
} from "@/types/modules";

import { PhoneFrame, ScreenDots, AdvanceButton, RichText } from "./primitives";
import { ScreenRenderer } from "./renderers";
import { InteractiveCall, type CallOutcome } from "./InteractiveCall";
import { PaymentActionFlow, type PaymentOutcome } from "./PaymentActionFlow";

type Stage = "warning" | "content" | "judgement" | "grading" | "feedback";

interface GradeResponse extends GradeResult {
  missed_signal: ModuleSignal | null;
  corrections: Array<{ claim: string; correction: string }>;
  canonical_reasoning: string;
  reveal: ModuleReveal;
}

export type { GradeResponse };

export interface GradeRequest {
  moduleSlug: string;
  learnerVerdict: LearnerVerdict | null;
  learnerReasoning: string;
  behaviouralLog: Record<string, unknown>;
}

export function ModuleRunner({
  module: mod,
  learnerFirstName,
  pack = "base",
  onFinished,
  gradeLocally,
}: {
  module: RunnableModule;
  learnerFirstName?: string;
  pack?: LanguagePackId;
  onFinished?: () => void;
  /**
   * Dev-preview escape hatch. When supplied, submitting grades through this
   * instead of POSTing to /api/modules/grade — which needs a signed-in session
   * and a seeded database, neither of which the preview harness has.
   *
   * The preview route already imports the authored content, answers included,
   * so this exposes nothing that route didn't already have. It is what makes
   * the feedback half of a module testable at all without a live Supabase.
   */
  gradeLocally?: (req: GradeRequest) => Promise<GradeResponse>;
}) {
  // Tokens are resolved once, here, so every renderer downstream sees plain
  // strings. Module 01 personalizes on purpose — that IS signal S5.
  const tokens = React.useMemo(
    () => resolvePack(pack, { LEARNER_FIRST_NAME: learnerFirstName }),
    [pack, learnerFirstName]
  );
  const blocks = React.useMemo(
    () => fillTokensDeep(mod.content_blocks ?? {}, tokens) as Record<string, any>,
    [mod.content_blocks, tokens]
  );
  const renderSpec = React.useMemo(
    () => fillTokensDeep(mod.render_spec, tokens),
    [mod.render_spec, tokens]
  );
  const callScript = React.useMemo(
    () => (mod.call_script ? fillTokensDeep(mod.call_script, tokens) : null),
    [mod.call_script, tokens]
  );
  const promptText = React.useMemo(
    () => fillTokensDeep(mod.prompt_text, tokens),
    [mod.prompt_text, tokens]
  );

  const [stage, setStage] = React.useState<Stage>(
    mod.content_warning ? "warning" : "content"
  );
  const [screenIndex, setScreenIndex] = React.useState(0);
  const [verdict, setVerdict] = React.useState<LearnerVerdict | null>(null);
  const [reasoning, setReasoning] = React.useState("");
  const [behaviour, setBehaviour] = React.useState<Record<string, unknown>>({});
  const [result, setResult] = React.useState<GradeResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const screens = renderSpec.screens ?? [];
  const isLastScreen = screenIndex >= screens.length - 1;

  // -------------------------------------------------------------------------

  async function authedFetch(body: unknown) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("You need to be signed in to save this attempt.");
    return fetch("/api/modules/grade", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
  }

  async function handleSkip() {
    try {
      await authedFetch({ moduleSlug: mod.slug, skipped: true });
    } catch (e) {
      console.warn("Skip not recorded:", e);
    } finally {
      onFinished?.();
    }
  }

  async function handleSubmit() {
    setStage("grading");
    setError(null);
    try {
      if (gradeLocally) {
        setResult(
          await gradeLocally({
            moduleSlug: mod.slug,
            learnerVerdict: verdict,
            learnerReasoning: reasoning,
            behaviouralLog: behaviour,
          })
        );
        setStage("feedback");
        return;
      }

      const res = await authedFetch({
        moduleSlug: mod.slug,
        learnerVerdict: verdict,
        learnerReasoning: reasoning,
        behaviouralLog: behaviour,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Grading failed");
      setResult(data as GradeResponse);
      setStage("feedback");
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
      setStage("judgement");
    }
  }

  function onCallComplete(outcome: CallOutcome) {
    // Only the log crosses over. Which outcomes fired, and what they mean, is
    // decided server-side from the module's own call_script at grade time.
    setBehaviour(outcome.log);
    setStage("judgement");
  }

  function onPaymentComplete(outcome: PaymentOutcome) {
    setBehaviour(outcome.log);
    setStage("judgement");
  }

  // --- Content warning -----------------------------------------------------
  // Module 08 induces real fear. That's what makes it work and it's also a duty
  // of care. Skipping must not penalize progress or mentor eligibility.
  if (stage === "warning") {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-amber-200 p-6 space-y-4">
        <div className="flex items-center gap-2 text-amber-700">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">
            Before you start
          </span>
        </div>
        <p className="text-sm text-slate-800 leading-relaxed">
          {mod.content_warning_text}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={() => setStage("content")}
            className="flex-1 py-3 bg-slate-900 text-white text-xs font-bold rounded-xl"
          >
            Continue
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 py-3 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl"
          >
            Skip this module
          </button>
        </div>
        {mod.skippable_without_penalty && (
          <p className="text-[11px] text-slate-500 text-center">
            Skipping won&apos;t affect your progress or mentor eligibility.
          </p>
        )}
      </div>
    );
  }

  // --- Stage ---------------------------------------------------------------
  if (stage === "content") {
    if (renderSpec.engine === "interactive_call" && callScript) {
      return (
        <div className="space-y-4">
          <PhoneFrame dark>
            <InteractiveCall script={callScript} onComplete={onCallComplete} />
          </PhoneFrame>
        </div>
      );
    }

    if (renderSpec.engine === "action_flow") {
      return (
        <div className="space-y-4">
          <PromptCard text={promptText} />
          <PhoneFrame>
            <PaymentActionFlow blocks={blocks} onComplete={onPaymentComplete} />
          </PhoneFrame>
        </div>
      );
    }

    const screen = screens[screenIndex];
    return (
      <div className="space-y-4">
        <PromptCard text={promptText} />
        <PhoneFrame>
          <ScreenRenderer screen={screen} blocks={blocks} />
        </PhoneFrame>
        <ScreenDots total={screens.length} index={screenIndex} />
        <div className="max-w-[380px] mx-auto">
          <AdvanceButton
            label={
              isLastScreen
                ? "I've seen enough — let me judge"
                : screen?.advance?.label || "Continue"
            }
            onClick={() =>
              isLastScreen ? setStage("judgement") : setScreenIndex((i) => i + 1)
            }
          />
        </div>
      </div>
    );
  }

  // --- Judgement -----------------------------------------------------------
  if (stage === "judgement" || stage === "grading") {
    // Every module asks the same question with the same two buttons. Module 07
    // used to relabel them (Accurate picture / Misleading) and Modules 06 and
    // 09 had their own wording too; the content files now all carry Real/Fake,
    // and the labels are read rather than hardcoded so a language pack can
    // still translate them.
    const labels = mod.verdict_labels ?? { positive: "Real", negative: "Fake" };
    const positiveValue: LearnerVerdict = "real";
    const negativeValue: LearnerVerdict = "fake";

    const busy = stage === "grading";

    return (
      <div className="max-w-xl mx-auto space-y-5">
        {/* What the learner DID is deliberately not shown here any more. Those
            lines are evaluative ("You did the right thing, and you did it
            fast"), and printing them above the Real/Fake buttons handed over
            the answer before the judgement was made. They now appear in the
            feedback, where they belong. */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-900">
              {mod.question_variant || "What's your call?"}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVerdict(positiveValue)}
                className={`p-3.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
                  verdict === positiveValue
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{labels.positive}</span>
              </button>
              <button
                type="button"
                onClick={() => setVerdict(negativeValue)}
                className={`p-3.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
                  verdict === negativeValue
                    ? "bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>{labels.negative}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-900">
              How do you know?
            </label>
            <p className="text-xs text-slate-500">
              Name the specific things in what you just saw. Your own words are fine.
            </p>
            <textarea
              rows={5}
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="What made you decide?"
              className="w-full p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none text-sm text-slate-900"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Text only, in both states. */}
          <button
            onClick={handleSubmit}
            disabled={busy || !verdict || reasoning.trim().length < 10}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm"
          >
            {busy ? "Checking your reasoning…" : "Submit"}
          </button>
        </div>
      </div>
    );
  }

  // --- Feedback + reveal ---------------------------------------------------
  if (stage === "feedback" && result) {
    return <FeedbackPanel module={mod} result={result} onFinished={onFinished} />;
  }

  return null;
}

// ---------------------------------------------------------------------------

function PromptCard({ text }: { text: string }) {
  return (
    <div className="max-w-xl mx-auto bg-slate-900 text-white rounded-2xl p-5">
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        <RichText text={text} />
      </p>
    </div>
  );
}

const SCORE_STYLE: Record<string, { label: string; cls: string }> = {
  accept: { label: "Strong reasoning", cls: "bg-emerald-50 border-emerald-200 text-emerald-900" },
  partial: { label: "Partly there", cls: "bg-amber-50 border-amber-200 text-amber-900" },
  reject: { label: "Let's look again", cls: "bg-slate-50 border-slate-200 text-slate-900" },
};

/**
 * The post-answer sequence.
 *
 * This used to be one card of personalized text followed by the entire
 * canonical_reasoning essay — six or seven paragraphs, immediately after an
 * interactive scenario, which is the exact moment nobody reads an essay. The
 * writing was good and almost none of it landed.
 *
 * Same content, four steps: what you noticed → the strongest clue → the other
 * signals → the takeaway. The full essay is still here, one tap away, for the
 * learners who want it — nothing was deleted to make this shorter.
 */
function FeedbackPanel({
  module: mod,
  result,
  onFinished,
}: {
  module: RunnableModule;
  result: GradeResponse;
  onFinished?: () => void;
}) {
  const [showReveal, setShowReveal] = React.useState(false);
  const [showFull, setShowFull] = React.useState(false);
  const style = SCORE_STYLE[result.score] ?? SCORE_STYLE.reject;
  const blocks = result.blocks;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* 1 — What you noticed. The only personal part, and it goes first. */}
      <div className={`rounded-2xl border p-5 space-y-3 ${style.cls}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-black uppercase tracking-wider opacity-70">
            What you noticed
          </span>
          <span className="text-[11px] font-black opacity-70">{style.label}</span>
        </div>
        <p className="text-sm leading-relaxed">{blocks?.noticed || result.feedback}</p>

        {result.advanced_reasoner && (
          <p className="text-xs font-bold">
            ⭐ That was one of the harder signals in this module.
          </p>
        )}
      </div>

      {/* Corrections. dangerous_reasoning is surfaced rather than buried inside
          a PARTIAL — it's the one category of wrong answer that could actually
          cost someone money. */}
      {blocks?.corrections?.length > 0 && (
        <div
          className={`rounded-2xl border p-4 space-y-1.5 ${
            result.dangerous_reasoning
              ? "border-rose-300 bg-rose-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div
            className={`flex items-center gap-1.5 ${
              result.dangerous_reasoning ? "text-rose-800" : "text-amber-800"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-wider">
              Worth stopping on
            </span>
          </div>
          {blocks.corrections.map((c, i) => (
            <p
              key={i}
              className={`text-sm leading-relaxed ${
                result.dangerous_reasoning ? "text-rose-900" : "text-amber-900"
              }`}
            >
              {c}
            </p>
          ))}
        </div>
      )}

      {/* 2 — The one piece of evidence that settles it. */}
      {blocks?.strongest && (
        <div className="bg-white rounded-2xl border-2 border-slate-900 p-5 space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Strongest clue
          </span>
          <p className="text-sm text-slate-900 leading-relaxed">
            <RichText text={blocks.strongest} />
          </p>
        </div>
      )}

      {/* 3 — Everything else, short. */}
      {blocks?.others?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Other signals
          </span>
          <ul className="space-y-2">
            {blocks.others.map((o, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-slate-800 leading-relaxed">
                <span className="text-slate-400 shrink-0" aria-hidden>
                  —
                </span>
                <span>
                  <RichText text={o} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4 — The one line worth keeping. */}
      {blocks?.takeaway && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Takeaway
          </span>
          <p className="text-sm leading-relaxed">
            <RichText text={blocks.takeaway} />
          </p>
        </div>
      )}

      {/* The locked reasoning. Read from the DB, never generated. Collapsed by
          default: it is the long version of everything above, and a learner who
          wants it should have it — without it being the wall of text that
          arrives the second they finish. */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowFull((v) => !v)}
          aria-expanded={showFull}
          className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2 text-slate-700">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-wider">
              The full breakdown
            </span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
              showFull ? "rotate-180" : ""
            }`}
          />
        </button>
        {showFull && (
          <div className="px-5 pb-5 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            <RichText text={result.canonical_reasoning} />
          </div>
        )}
      </div>

      {!showReveal ? (
        <button
          onClick={() => setShowReveal(true)}
          className="w-full py-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2"
        >
          Show the real case behind this
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-2">
          <h4 className="text-sm font-black text-indigo-950">
            {result.reveal?.headline}
          </h4>
          <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-wrap">
            {result.reveal?.body}
          </p>
          {result.reveal?.localizationNote && (
            <p className="text-xs text-indigo-800 pt-1">
              {result.reveal.localizationNote}
            </p>
          )}
          {result.reveal?.sourceLinks && result.reveal.sourceLinks.length > 0 && (
            <ul className="text-[11px] text-indigo-700 pt-1 space-y-0.5">
              {result.reveal.sourceLinks.map((l) => (
                <li key={l} className="truncate">
                  {l}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        onClick={onFinished}
        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm"
      >
        Back to modules
      </button>
    </div>
  );
}

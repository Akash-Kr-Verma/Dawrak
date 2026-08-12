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
  Users,
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
      <div className="max-w-md mx-auto bg-surface rounded-2xl border border-spark-100 p-6 space-y-4">
        <div className="flex items-center gap-2 text-spark-700">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">
            Before you start
          </span>
        </div>
        <p className="text-sm text-ink-soft leading-relaxed">
          {mod.content_warning_text}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={() => setStage("content")}
            className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl btn-press"
          >
            Continue
          </button>
          <button
            onClick={handleSkip}
            className="flex-1 py-3 border-2 border-line text-ink-soft text-xs font-bold rounded-xl btn-press"
          >
            Skip this module
          </button>
        </div>
        {mod.skippable_without_penalty && (
          <p className="text-[11px] text-ink-muted text-center">
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
    // used to relabel them (Accurate picture / Misleading), and Modules 06 and
    // 09 had their own wording too.
    //
    // The label is read from the row, but NOT trusted: a database still on the
    // previous seed hands back "Accurate picture" while the button now submits
    // 'real', which would mark the correct answer wrong. Any pair that isn't
    // the standardized one is replaced rather than rendered, so the judgement
    // is correct whether or not the current seed has been applied yet.
    const raw = mod.verdict_labels ?? { positive: "Real", negative: "Fake" };
    const labels =
      raw.positive === "Real" && raw.negative === "Fake"
        ? raw
        : { positive: "Real", negative: "Fake" };
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
        <div className="bg-surface rounded-2xl border border-line shadow-card p-5 space-y-5">
          <div className="space-y-3">
            <label className="block text-sm font-bold text-ink">
              {mod.question_variant || "What's your call?"}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVerdict(positiveValue)}
                className={`p-3.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
                  verdict === positiveValue
                    ? "bg-success-50 border-success-600 text-success-800 ring-4 ring-success-100"
                    : "border-line hover:border-line-strong text-ink-soft"
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-success-600" />
                <span>{labels.positive}</span>
              </button>
              <button
                type="button"
                onClick={() => setVerdict(negativeValue)}
                className={`p-3.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-2 transition-all ${
                  verdict === negativeValue
                    ? "bg-danger-50 border-danger-600 text-danger-700 ring-4 ring-danger-100"
                    : "border-line hover:border-line-strong text-ink-soft"
                }`}
              >
                <ShieldAlert className="w-5 h-5 text-danger-600" />
                <span>{labels.negative}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-ink">
              How do you know?
            </label>
            <p className="text-xs text-ink-muted">
              Name the specific things in what you just saw. Your own words are fine.
            </p>
            <textarea
              rows={5}
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="What made you decide?"
              className="w-full p-3.5 border-2 border-line rounded-xl focus:border-brand-600 focus:outline-none text-sm text-ink bg-surface transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-danger-50 border border-danger-100 rounded-xl text-xs text-danger-700 font-medium">
              {error}
            </div>
          )}

          {/* Text only, in both states. */}
          <button
            onClick={handleSubmit}
            disabled={busy || !verdict || reasoning.trim().length < 10}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm btn-press"
          >
            {busy ? "Checking your reasoning…" : "Submit"}
          </button>
        </div>
      </div>
    );
  }

  // --- Feedback + reveal ---------------------------------------------------
  if (stage === "feedback" && result) {
    return (
      <FeedbackPanel
        module={mod}
        result={result}
        onFinished={onFinished}
        // The dev preview harness grades locally against imported content and
        // writes no progress, so there is nothing to mentor from it.
        canMentor={!gradeLocally}
      />
    );
  }

  return null;
}

// ---------------------------------------------------------------------------

function PromptCard({ text }: { text: string }) {
  return (
    <div className="max-w-xl mx-auto bg-ink text-white rounded-2xl p-5">
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        <RichText text={text} />
      </p>
    </div>
  );
}

const SCORE_STYLE: Record<string, { label: string; cls: string }> = {
  accept: { label: "Strong reasoning", cls: "bg-success-50 border-success-100 text-success-800" },
  partial: { label: "Partly there", cls: "bg-spark-50 border-spark-100 text-spark-700" },
  reject: { label: "Let's look again", cls: "bg-surface-sunken border-line text-ink" },
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
  canMentor = false,
}: {
  module: RunnableModule;
  result: GradeResponse;
  onFinished?: () => void;
  canMentor?: boolean;
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
            That was one of the harder signals in this module.
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
              ? "border-danger-100 bg-danger-50"
              : "border-spark-100 bg-spark-50"
          }`}
        >
          <div
            className={`flex items-center gap-1.5 ${
              result.dangerous_reasoning ? "text-danger-700" : "text-spark-700"
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
                result.dangerous_reasoning ? "text-danger-700" : "text-spark-700"
              }`}
            >
              {c}
            </p>
          ))}
        </div>
      )}

      {/* 2 — The one piece of evidence that settles it. */}
      {blocks?.strongest && (
        <div className="bg-surface rounded-2xl border-2 border-brand-600 p-5 space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-ink-muted">
            Strongest clue
          </span>
          <p className="text-sm text-ink leading-relaxed">
            <RichText text={blocks.strongest} />
          </p>
        </div>
      )}

      {/* 3 — Everything else, short. */}
      {blocks?.others?.length > 0 && (
        <div className="bg-surface rounded-2xl border border-line p-5 space-y-2.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-ink-muted">
            Other signals
          </span>
          <ul className="space-y-2">
            {blocks.others.map((o, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-ink-soft leading-relaxed">
                <span className="text-ink-faint shrink-0" aria-hidden>
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
        <div className="bg-ink text-white rounded-2xl p-5 space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-white/60">
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
      <div className="bg-surface rounded-2xl border border-line overflow-hidden">
        <button
          onClick={() => setShowFull((v) => !v)}
          aria-expanded={showFull}
          className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2 text-ink-soft">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-wider">
              The full breakdown
            </span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-ink-muted shrink-0 transition-transform ${
              showFull ? "rotate-180" : ""
            }`}
          />
        </button>
        {showFull && (
          <div className="px-5 pb-5 text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">
            <RichText text={result.canonical_reasoning} />
          </div>
        )}
      </div>

      {!showReveal ? (
        <button
          onClick={() => setShowReveal(true)}
          className="w-full py-3 border-2 border-line rounded-xl text-xs font-bold text-ink-soft btn-press flex items-center justify-center gap-2"
        >
          Show the real case behind this
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="bg-mentor-50 border border-mentor-100 rounded-2xl p-5 space-y-2">
          <h4 className="text-sm font-black text-mentor-800">
            {result.reveal?.headline}
          </h4>
          <p className="text-sm text-mentor-800 leading-relaxed whitespace-pre-wrap">
            {result.reveal?.body}
          </p>
          {result.reveal?.localizationNote && (
            <p className="text-xs text-mentor-700 pt-1">
              {result.reveal.localizationNote}
            </p>
          )}
          {result.reveal?.sourceLinks && result.reveal.sourceLinks.length > 0 && (
            <ul className="text-[11px] text-mentor-700 pt-1 space-y-0.5">
              {result.reveal.sourceLinks.map((l) => (
                <li key={l} className="truncate">
                  {l}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Finishing a module is what makes it mentorable, so the offer to pass
          it on belongs here rather than only in the Mentor Hub. The link opens
          the Hub with this module's share dialog already up. */}
      {canMentor && (
        <a
          href={`/mentor?share=${mod.slug}`}
          className="w-full py-3.5 bg-mentor-600 hover:bg-mentor-700 text-white font-bold rounded-xl text-sm btn-press flex items-center justify-center gap-2"
        >
          <Users className="w-4 h-4" />
          Mentor this — send it to someone
        </a>
      )}

      <button
        onClick={onFinished}
        className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm btn-press"
      >
        Back to modules
      </button>
    </div>
  );
}

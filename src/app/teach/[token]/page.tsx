// src/app/teach/[token]/page.tsx
//
// The public side of mentoring: someone with no account opens a link a mentor
// sent them, judges the situation, says why, and gets a personal reply back.
//
// Laid out against share-view_3.html — the same four beats in the same order:
//   "<name> wants to share something they learned with you"
//   → the situation, presented like something you'd actually be forwarded
//   → your call, then why you made it
//   → waiting on a person, then their reply.
//
// The situation is the real thing, not a description of it. `get_share_link`
// returns render_spec / content_blocks / call_script (0006_share_scenario.sql),
// so the recipient walks the same screens — the SMS, the portal, the listing,
// the call — that a signed-in learner walks. The engines are the same
// components too; only what happens afterwards differs. A learner gets graded
// feedback and the reveal. A recipient gets neither: their feedback is the
// mentor's reply, written by hand, and that is the entire point of this flow.
//
// Deliberately outside the (dashboard) route group — no auth, no bottom nav,
// no ProtectedRoute. The three RPCs it calls are the only database surface
// granted to `anon`; see supabase/migrations/0003_mentoring.sql.
//
// There is no answer key on this page, by design. The verdict and the module's
// reasoning are never sent to the browser, so a curious recipient cannot read
// the answer out of the network tab — and the reply they get is a person's,
// not a machine's. That is the whole point of the flow.
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { REASON_CHIPS, chipLabel } from "@/types/mentor";
import type { PublicShareLink, PublicShareResponse } from "@/types/mentor";
import { fillTokensDeep, resolvePack } from "@/content/languagePacks";
import {
  PhoneFrame,
  ScreenDots,
  AdvanceButton,
  RichText,
} from "@/components/modules/primitives";
import { ScreenRenderer } from "@/components/modules/renderers";
import { InteractiveCall } from "@/components/modules/InteractiveCall";
import { PaymentActionFlow } from "@/components/modules/PaymentActionFlow";
import { Avatar } from "@/components/ui";
import {
  Loader2,
  ShieldAlert,
  Users,
  Check,
  Eye,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

// `scenario` is the walk through the actual screens; `question` is the judgement
// that follows it. A link whose module row predates 0006_share_scenario.sql has
// no screens to walk, and goes straight to `question` with the written prompt.
type Step = "loading" | "gone" | "scenario" | "question" | "waiting" | "reply";

const receiptKey = (token: string) => `pyp_share_receipt_${token}`;

export default function TeachPage({ params }: { params: { token: string } }) {
  const { token } = params;

  const [step, setStep] = useState<Step>("loading");
  const [link, setLink] = useState<PublicShareLink | null>(null);
  const [warningAccepted, setWarningAccepted] = useState(false);

  const [screenIndex, setScreenIndex] = useState(0);

  const [choice, setChoice] = useState<"positive" | "negative" | null>(null);
  const [chips, setChips] = useState<Set<string>>(new Set());
  const [reasonText, setReasonText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [receipt, setReceipt] = useState<string | null>(null);
  const [answer, setAnswer] = useState<PublicShareResponse | null>(null);

  // ---- Load the shared module -------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_share_link", {
        p_token: token,
      });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) {
        setStep("gone");
        return;
      }
      const shared = row as PublicShareLink;
      setLink(shared);

      // Coming back to a link already answered on this device picks up where
      // it left off rather than asking the same question twice. localStorage
      // can throw outright (Safari private browsing, storage disabled), and a
      // recipient who cannot resume should still get the question.
      let saved: string | null = null;
      try {
        saved = window.localStorage.getItem(receiptKey(token));
      } catch {
        saved = null;
      }
      if (saved) {
        setReceipt(saved);
        setStep("waiting");
      } else {
        setStep(hasScenario(shared) ? "scenario" : "question");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ---- Poll for the mentor's reply --------------------------------------
  const pollReply = useCallback(async () => {
    if (!receipt) return;
    const { data } = await supabase.rpc("get_share_response", {
      p_receipt: receipt,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return;
    setAnswer(row as PublicShareResponse);
    if ((row as PublicShareResponse).mentor_reply) setStep("reply");
  }, [receipt]);

  useEffect(() => {
    if (!receipt || step === "reply") return;
    pollReply();
    const id = setInterval(pollReply, 10_000);
    return () => clearInterval(id);
  }, [receipt, step, pollReply]);

  const toggleChip = (id: string) => {
    setChips((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // The scenario is authored with {{TOKENS}} — brand names, amounts, the
  // learner's own first name. There is no account here to personalize from, so
  // resolvePack's neutral fallback ("there") stands in. Resolved once, so every
  // renderer downstream sees plain strings, exactly as ModuleRunner does it.
  const tokens = React.useMemo(() => resolvePack("base"), []);
  const scenario = React.useMemo(() => {
    if (!link?.render_spec) return null;
    return {
      spec: fillTokensDeep(link.render_spec, tokens),
      blocks: fillTokensDeep(
        (link.content_blocks ?? {}) as Record<string, any>,
        tokens
      ),
      call: link.call_script ? fillTokensDeep(link.call_script, tokens) : null,
    };
  }, [link, tokens]);

  const ready =
    choice !== null && (chips.size > 0 || reasonText.trim().length > 5);

  const handleSubmit = async () => {
    if (!ready || !link || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    // Module 07 reframes the question from real/fake to accurate/misleading, so
    // the stored verdict has to follow the labels the recipient actually saw.
    const isAccuracyFramed =
      link.verdict_labels?.positive?.toLowerCase() === "accurate";
    const verdict =
      choice === "positive"
        ? isAccuracyFramed
          ? "accurate"
          : "real"
        : isAccuracyFramed
        ? "misleading"
        : "fake";

    try {
      const { data, error } = await supabase.rpc("submit_share_response", {
        p_token: token,
        p_verdict: verdict,
        p_reasoning: reasonText.trim(),
        p_chips: Array.from(chips),
      });
      if (error) throw new Error(error.message);
      const r = data as string;
      setReceipt(r);
      // Losing the receipt costs the recipient the ability to come back to
      // this link later — it does not cost them the submission, which is
      // already stored. Never let it break the confirmation.
      try {
        window.localStorage.setItem(receiptKey(token), r);
      } catch {
        /* storage unavailable — the page stays live in this tab regardless */
      }
      setStep("waiting");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setSubmitError(e?.message ?? "Could not send your answer. Try again?");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- States ------------------------------------------------------------
  if (step === "loading") {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-24">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-xs font-semibold text-ink-faint uppercase tracking-wider">
            Opening what they sent you
          </p>
        </div>
      </Shell>
    );
  }

  if (step === "gone" || !link) {
    return (
      <Shell>
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 bg-surface-sunken rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-ink-muted" />
          </div>
          <h1 className="text-lg font-black text-ink">
            This link isn&apos;t active
          </h1>
          <p className="text-sm text-ink-muted max-w-xs mx-auto">
            The person who shared it may have turned it off, or the address was
            copied incompletely.
          </p>
        </div>
      </Shell>
    );
  }

  const positiveLabel = link.verdict_labels?.positive ?? "Real";
  const negativeLabel = link.verdict_labels?.negative ?? "Fake";
  const questionText =
    link.question_variant ??
    `What do you think — ${negativeLabel.toLowerCase()} or ${positiveLabel.toLowerCase()}?`;

  const echo = [
    choice === "positive" ? positiveLabel : negativeLabel,
    ...Array.from(chips).map(chipLabel),
  ].join(" · ");

  // The warning gates the scenario, not just the question — it exists because
  // of what the scenario itself does to you.
  const gateOpen = !link.content_warning || warningAccepted;
  const showWarning =
    link.content_warning &&
    !warningAccepted &&
    (step === "scenario" || step === "question");
  const showScenario = step === "scenario" && gateOpen && scenario !== null;
  const showQuestion = step === "question" && gateOpen;

  const screens = scenario?.spec.screens ?? [];
  const screen = screens[screenIndex];
  const isLastScreen = screenIndex >= screens.length - 1;

  return (
    <Shell>
      {/* Who sent this, and why the reader is looking at it at all.
          The avatar is the mentor's own — 0009 puts it in the payload. Before
          that this was a circle with one letter in it, which is what a form
          looks like, not what a person looks like. */}
      <div className="text-center mb-6">
        <div className="inline-flex flex-col items-center">
          <Avatar
            url={link.mentor_avatar_url}
            name={link.mentor_name}
            size={76}
            ring
          />
          <span className="inline-flex items-center mt-3 px-2.5 py-1 rounded-full bg-mentor-50 border border-mentor-100 text-[10px] font-extrabold uppercase tracking-wider text-mentor-800">
            Shared with you
          </span>
        </div>
        <p className="text-ink-soft text-base leading-relaxed mt-3">
          <span className="font-black text-ink">{link.mentor_name}</span>{" "}
          wants to share something they learned with you
        </p>
        {step !== "reply" && (
          <p className="text-xs text-ink-muted mt-2 max-w-xs mx-auto leading-relaxed">
            Takes a minute, and no account. There&apos;s no score and no right
            answer waiting to catch you out.
          </p>
        )}
      </div>

      {/* What is about to happen, in three beats. A stranger opening a link
          from a friend has no idea whether this is a quiz, a signup or a scam
          — saying so up front is what makes the first tap likely. */}
      <BeatStrip step={step} />

      {/* The one thing that makes this different from every other link like
          it: a real person is on the other end. Said before they judge, not
          after, because it changes how carefully they answer. */}
      {(showScenario || showQuestion) && (
        <div className="flex items-start gap-2.5 bg-surface border border-line rounded-2xl px-4 py-3 mb-6 shadow-card">
          <MessageSquare className="w-4 h-4 text-mentor-600 shrink-0 mt-0.5" />
          <p className="text-xs text-ink-soft leading-relaxed">
            Whatever you send goes straight to{" "}
            <span className="font-bold text-ink">{link.mentor_name}</span> — no
            bot, no answer key. They write back themselves.
          </p>
        </div>
      )}

      {/* Content warning, where the module carries one. Shown before the
          situation itself, and it has to be accepted to continue. */}
      {showWarning && (
        <div className="bg-spark-50 border border-spark-100 rounded-2xl p-6 mb-6 text-center space-y-3">
          <ShieldAlert className="w-6 h-6 text-spark-600 mx-auto" />
          <p className="text-sm text-spark-700">
            {link.content_warning_text ??
              "This one covers a difficult subject."}
          </p>
          <button
            onClick={() => setWarningAccepted(true)}
            className="px-4 py-2 bg-spark-600 hover:bg-spark-700 text-white rounded-xl text-xs font-bold"
          >
            I&apos;m ready
          </button>
        </div>
      )}

      {/* ---- The scenario itself -------------------------------------- */}
      {showScenario && scenario && (
        <div className="space-y-4">
          {/* The call opens on its own lock screen and sets its own scene;
              a framing card above it would break that. */}
          {scenario.spec.engine !== "interactive_call" && (
            <SituationCard
              title={link.module_title}
              prompt={link.prompt_text}
            />
          )}

          {scenario.spec.engine === "interactive_call" && scenario.call && (
            <PhoneFrame dark>
              <InteractiveCall
                script={scenario.call}
                // The behavioural outcomes this returns are empty by design —
                // `get_share_link` strips them, because on this flow the
                // feedback is the mentor's, not the app's. What the recipient
                // DID still shapes nothing here; what they SAY is the answer.
                onComplete={() => setStep("question")}
              />
            </PhoneFrame>
          )}

          {scenario.spec.engine === "action_flow" && (
            <PhoneFrame>
              <PaymentActionFlow
                blocks={scenario.blocks}
                onComplete={() => setStep("question")}
              />
            </PhoneFrame>
          )}

          {scenario.spec.engine === "screen_sequence" && screen && (
            <>
              <PhoneFrame>
                <ScreenRenderer screen={screen} blocks={scenario.blocks} />
              </PhoneFrame>
              <ScreenDots total={screens.length} index={screenIndex} />
              <div className="max-w-[380px] mx-auto">
                <AdvanceButton
                  label={
                    isLastScreen
                      ? "I've seen enough — let me judge"
                      : screen.advance?.label || "Continue"
                  }
                  onClick={() =>
                    isLastScreen
                      ? setStep("question")
                      : setScreenIndex((i) => i + 1)
                  }
                />
              </div>
            </>
          )}
        </div>
      )}

      {showQuestion && (
        <>
          {/* Where the recipient walked the scenario, repeating the whole
              framing card here would just push the buttons off the screen —
              they were looking at it a second ago. Where there were no screens
              to walk, this card IS the situation. */}
          {scenario ? (
            <div className="bg-surface rounded-2xl shadow-card border border-line px-5 py-4 mb-6">
              <p className="text-[10px] uppercase tracking-wider text-ink-muted font-bold mb-1">
                What you just looked at
              </p>
              <p className="text-sm font-bold text-ink">
                {link.module_title}
              </p>
            </div>
          ) : (
            <SituationCard title={link.module_title} prompt={link.prompt_text} />
          )}

          <p className="text-center font-black text-lg mb-4 text-ink">
            {questionText}
          </p>

          {/* Same two controls a signed-in learner gets in ModuleRunner —
              tone and icon per side, selection shown with a ring rather than a
              colour swap. Two identical violet outlines made the choice look
              like a form field; this looks like a call you are making. */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {(["positive", "negative"] as const).map((side) => {
              const label = side === "positive" ? positiveLabel : negativeLabel;
              const selected = choice === side;
              const Icon = side === "positive" ? CheckCircle2 : ShieldAlert;
              const on =
                side === "positive"
                  ? "bg-success-50 border-success-600 text-success-800 ring-4 ring-success-100"
                  : "bg-danger-50 border-danger-600 text-danger-700 ring-4 ring-danger-100";
              const iconTone =
                side === "positive" ? "text-success-600" : "text-danger-600";
              return (
                <button
                  key={side}
                  onClick={() => setChoice(side)}
                  aria-pressed={selected}
                  className={`p-4 rounded-xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition-all ${
                    selected
                      ? on
                      : "border-line hover:border-line-strong text-ink-soft bg-surface"
                  }`}
                >
                  <Icon className={`w-6 h-6 ${iconTone}`} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {choice && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <p className="font-bold mb-1 text-ink text-sm">
                What made you think that?
              </p>
              <p className="text-[11px] text-ink-muted mb-3">
                Pick what applies, or write it yourself — this is the part{" "}
                {link.mentor_name} actually reads.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {REASON_CHIPS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleChip(c.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      chips.has(c.id)
                        ? "bg-brand-600 text-white border-brand-600"
                        : "border-line-strong text-ink-soft hover:border-brand-300"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                maxLength={2000}
                placeholder="Say it in your own words too, if you want..."
                className="w-full min-h-[90px] p-4 rounded-xl border-2 border-line text-sm mb-4 text-ink focus:outline-none focus:border-brand-600"
              />
              {submitError && (
                <p className="text-xs text-danger-700 mb-3">{submitError}</p>
              )}
              <button
                onClick={handleSubmit}
                disabled={!ready || submitting}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3.5 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Send to {link.mentor_name}
              </button>
              <p className="text-[11px] text-ink-muted text-center mt-3">
                There&apos;s no automatic answer key — {link.mentor_name} will
                reply personally, in their own words.
              </p>
            </div>
          )}
        </>
      )}

      {step === "waiting" && (
        <>
          <div className="bg-success-50 border border-success-100 rounded-2xl px-5 py-3 mb-4 flex items-center gap-2">
            <Check className="w-4 h-4 text-success-600 shrink-0" />
            <p className="text-xs font-bold text-success-800">
              Sent to {link.mentor_name}
            </p>
          </div>

          <SentCard text={answer ? formatAnswer(answer) : echo} />

          <div className="bg-surface-sunken rounded-2xl p-8 text-center border border-line">
            <Avatar
              url={link.mentor_avatar_url}
              name={link.mentor_name}
              size={56}
              ring
              className="mb-3"
            />
            <div className="flex justify-center gap-1 mb-4">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-brand-600 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <p className="font-bold mb-1 text-ink">
              {link.mentor_name} is reading your answer
            </p>
            <p className="text-sm text-ink-muted leading-relaxed">
              They reply personally — no bot, no automatic answer key. This page
              updates itself, so you can leave it open or come back to the same
              link later.
            </p>
          </div>

          <p className="text-[11px] text-ink-faint text-center mt-4">
            Keep this link — it&apos;s where their reply will show up.
          </p>
        </>
      )}

      {step === "reply" && answer && (
        <>
          <SentCard text={formatAnswer(answer)} />

          {/* The reply is the payoff of the whole flow, so it is presented as
              a message from a person — their face, their name, their words —
              rather than as a result panel. */}
          <div className="bg-surface rounded-2xl shadow-card border-2 border-success-600 p-6 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <Avatar
                url={answer.mentor_avatar_url ?? link.mentor_avatar_url}
                name={answer.mentor_name}
                size={44}
              />
              <div className="min-w-0">
                <p className="text-sm font-black text-ink truncate">
                  {answer.mentor_name}
                </p>
                <p className="text-[11px] text-success-700 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  replied to you
                </p>
              </div>
            </div>
            <p className="text-[15px] leading-relaxed text-ink-soft whitespace-pre-wrap">
              {answer.mentor_reply}
            </p>
          </div>

          <div className="bg-brand-600 text-white rounded-2xl p-6 text-center">
            <span className="w-11 h-11 rounded-2xl bg-brand-700 flex items-center justify-center mx-auto mb-3">
              <Users className="w-5 h-5" />
            </span>
            <p className="font-black text-lg mb-1">
              That&apos;s how Dawrak works
            </p>
            <p className="text-sm text-brand-100 mb-1 leading-relaxed">
              {link.mentor_name} learned this one, then taught it to you.
            </p>
            <p className="text-sm text-brand-100 mb-4 leading-relaxed">
              Learn the next one yourself — free — and you can pass it on the
              same way.
            </p>
            <a
              href="/login"
              className="btn-press inline-flex items-center justify-center gap-2 bg-white hover:bg-brand-50 text-brand-700 px-6 py-3 rounded-xl font-bold w-full transition-colors"
            >
              Join Dawrak
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </>
      )}
    </Shell>
  );
}

/** True once the link carries the module's screens. False against a database
 *  still on 0003, where the page falls back to prompt text alone. */
function hasScenario(link: PublicShareLink): boolean {
  const spec = link.render_spec;
  if (!spec?.engine) return false;
  if (spec.engine === "interactive_call") return !!link.call_script;
  if (spec.engine === "screen_sequence") return (spec.screens ?? []).length > 0;
  return true;
}

/** The situation framed like something you were forwarded, not like a quiz
 *  question. Carries the module's authored emphasis — `prompt_text` uses
 *  **bold** and the asterisks must not reach the reader. */
function SituationCard({ title, prompt }: { title: string; prompt: string }) {
  return (
    <div className="bg-surface rounded-2xl shadow-card border border-line overflow-hidden mb-6">
      <div className="px-5 py-3 border-b border-line bg-surface-sunken">
        <p className="text-[10px] uppercase tracking-wider text-ink-muted font-bold">
          Take a look at this
        </p>
      </div>
      <div className="p-6">
        <h1 className="text-xl font-black leading-snug mb-3 text-ink">
          {title}
        </h1>
        <RichText
          text={prompt}
          className="text-ink-soft text-sm leading-relaxed whitespace-pre-wrap block"
        />
      </div>
    </div>
  );
}

/**
 * The three beats of this flow, with the current one lit.
 *
 * Someone opening a link a friend sent them does not know whether they are
 * about to be quizzed, signed up, or phished — and this page asks them to look
 * at a scam before it explains itself. Saying "look, decide, hear back" up
 * front is what makes the first tap likely, and it also sets the expectation
 * that the last step involves waiting for a human.
 */
function BeatStrip({ step }: { step: Step }) {
  const at = step === "waiting" || step === "reply" ? 2 : step === "question" ? 1 : 0;
  const beats = [
    { icon: Eye, label: "Look at it" },
    { icon: CheckCircle2, label: "Your call" },
    { icon: MessageSquare, label: "Their reply" },
  ];

  return (
    <ol className="flex items-center gap-1.5 mb-6">
      {beats.map((b, i) => {
        const Icon = b.icon;
        const done = i < at;
        const now = i === at;
        return (
          <li key={b.label} className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="flex flex-col items-center text-center flex-1 min-w-0">
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 ${
                  now
                    ? "bg-brand-600 text-white ring-4 ring-brand-100"
                    : done
                    ? "bg-mentor-600 text-white"
                    : "bg-surface-sunken text-ink-muted border border-line"
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </span>
              <span
                className={`text-[10px] leading-tight truncate max-w-full ${
                  now ? "font-extrabold text-ink" : "font-semibold text-ink-muted"
                }`}
              >
                {b.label}
              </span>
            </div>
            {i < beats.length - 1 && (
              <span
                className={`h-0.5 w-3 rounded-full shrink-0 ${
                  done ? "bg-mentor-600" : "bg-line"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function formatAnswer(a: PublicShareResponse): string {
  const parts = [
    a.learner_verdict
      ? a.learner_verdict.charAt(0).toUpperCase() + a.learner_verdict.slice(1)
      : "",
    ...(a.reason_chips ?? []).map(chipLabel),
  ].filter(Boolean);
  let out = parts.join(" · ");
  if (a.learner_reasoning) out += ` — "${a.learner_reasoning}"`;
  return out;
}

function SentCard({ text }: { text: string }) {
  return (
    <div className="bg-surface rounded-2xl shadow-card border border-line p-6 mb-4">
      <p className="text-[10px] uppercase tracking-wide text-ink-muted font-bold mb-2">
        What you sent
      </p>
      <p className="text-sm text-ink-soft leading-relaxed">{text || "—"}</p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-lg mx-auto px-5 sm:px-6 py-10">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <span className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center">
            <Users className="w-4 h-4" />
          </span>
          <span className="font-black text-ink tracking-tight text-lg">
            Dawrak
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

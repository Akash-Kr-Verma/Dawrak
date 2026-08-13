"use client";

// src/app/(dashboard)/challenge/page.tsx
//
// Daily Challenge + Questions Bank.
//
// This screen used to POST a hardcoded `userId: "demo-user-123"` and an
// in-memory scenario id, so every attempt failed its foreign key and was
// swallowed. It is now signed-in like the rest of the dashboard, submits the
// uuid of a stored scenario, and shows the learner whether their attempt was
// actually recorded.
//
// The verdict is no longer in the payload that renders the card — it arrives
// with the grade, after the learner has answered.
//
// Presentation-wise this is a case file, not a form. The evidence sits in one
// clearly-bounded card, the three things being asked are numbered steps that
// tick off as they are filled, and the screen says what happens on submit
// before you press it — the old version was a wall of inputs that gave no clue
// whether the answer was graded, scored, or seen by anyone.

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChallenge } from "@/hooks/useChallenge";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CATEGORY_LABEL } from "@/types/challenge";
import {
  Card,
  SectionHeader,
  Badge,
  Button,
  EmptyState,
  PageHeader,
  PageLoader,
} from "@/components/ui";
import {
  CheckCircle2,
  Volume2,
  MessageSquare,
  Share2,
  Globe,
  Search,
  ShieldAlert,
  Loader2,
  Send,
  HelpCircle,
  RefreshCw,
  Flame,
  Users,
  PlusCircle,
  X,
  AlertTriangle,
  Trophy,
  Inbox,
} from "lucide-react";

export default function ChallengePage() {
  const { user, loading: authLoading } = useAuth();
  const {
    scenario,
    feedback,
    streak,
    bank,
    loading,
    submitting,
    error,
    nextChallenge,
    submit,
    submitToBank,
  } = useChallenge(user?.id);

  const [assessment, setAssessment] = useState<"fake" | "real" | "evidence" | "">("");
  const [userReasoning, setUserReasoning] = useState("");
  const [noSourceFound, setNoSourceFound] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");

  // Questions Bank submission
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankTitle, setBankTitle] = useState("");
  const [bankBody, setBankBody] = useState("");
  const [bankCategory, setBankCategory] = useState("phishing");
  const [bankBusy, setBankBusy] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankDone, setBankDone] = useState(false);

  const resetForm = () => {
    setAssessment("");
    setUserReasoning("");
    setNoSourceFound(false);
    setSourceUrl("");
  };

  const handleNext = () => {
    resetForm();
    nextChallenge();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessment || userReasoning.trim().length < 15) return;
    await submit({
      assessment: assessment as "real" | "fake" | "evidence",
      userReasoning,
      sourceUrl,
      noSourceFound,
    });
  };

  const handleBankSubmit = async (verdict: "real" | "fake") => {
    setBankBusy(true);
    setBankError(null);
    try {
      await submitToBank({
        title: bankTitle,
        body: bankBody,
        verdict,
        category: bankCategory,
      });
      setBankDone(true);
      setBankTitle("");
      setBankBody("");
    } catch (err: any) {
      setBankError(err?.message ?? "Could not submit that.");
    } finally {
      setBankBusy(false);
    }
  };

  if (authLoading) return <PageLoader label="Loading" />;

  const reasoningOk = userReasoning.trim().length >= 15;
  // /api/feedback rejects the attempt unless noSourceFound is set or sourceUrl
  // is a real http(s) link — mirrored here so the button can't be pressed into
  // a server error. The old screen let you submit and surfaced the rejection
  // only after the round trip.
  const sourceOk = noSourceFound || /^https?:\/\//i.test(sourceUrl.trim());
  const canSubmit = !!assessment && reasoningOk && sourceOk && !submitting;

  return (
    <ProtectedRoute>
      <div className="space-y-5 animate-fade-up">
        <PageHeader
          data-tour="challenge-daily"
          title="Today's case"
          subtitle="Look at what came in, make a call, and say what convinced you."
          right={
            <div className="flex items-center gap-2">
              {streak > 0 && (
                <Badge tone="danger" icon={Flame} className="px-3 py-1.5">
                  Day {streak}
                </Badge>
              )}
              <Button
                onClick={handleNext}
                disabled={loading}
                variant="outline"
                size="sm"
                icon={RefreshCw}
              >
                New case
              </Button>
            </div>
          }
        />

        {error && (
          <div className="bg-spark-50 border border-spark-100 rounded-2xl p-4 text-sm text-spark-700 font-medium">
            {error}
          </div>
        )}

        {/* ---- The evidence -------------------------------------------- */}
        {loading ? (
          <Card>
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-7 h-7 text-brand-600 animate-spin mx-auto" />
              <p className="text-sm font-bold text-ink-muted">
                Finding a situation for you…
              </p>
            </div>
          </Card>
        ) : scenario ? (
          <Card padded={false} className="shadow-lift">
            {/* Where it came from — the metadata that actually matters. */}
            <div className="bg-ink text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 font-bold uppercase tracking-wider text-[10px]">
                  <Globe className="w-3 h-3" />
                  {scenario.source_channel || "Internet claim"}
                </span>
                <span className="text-white/40">•</span>
                <span className="text-white/80 font-medium">
                  {scenario.original_publisher || "Unattributed"}
                </span>
              </div>

              {scenario.viral_reach && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-spark-600 px-2.5 py-1 rounded-lg">
                  <Share2 className="w-3 h-3" />
                  {scenario.viral_reach}
                </span>
              )}
            </div>

            {/* Questions Bank attribution — the prototype's "a mentor submitted
                this and tagged it themselves; no AI checked it". */}
            {scenario.origin === "questions_bank" && (
              <div className="bg-mentor-50 border-b border-mentor-100 px-5 py-2.5 flex items-start gap-2 text-xs text-mentor-800">
                <Users className="w-4 h-4 text-mentor-600 shrink-0 mt-px" />
                <span>
                  Submitted to the Questions Bank by{" "}
                  <strong>{scenario.submitted_by_name}</strong> and tagged by
                  them — no AI checked it.
                </span>
              </div>
            )}

            {scenario.source_channel === "WhatsApp Forward" && (
              <div className="bg-success-50 border-b border-success-100 px-5 py-2.5 flex items-center gap-2 text-xs font-bold text-success-800">
                <span className="inline-flex items-center justify-center bg-success-600 text-white rounded-full p-1">
                  <Share2 className="w-3 h-3" />
                </span>
                Forwarded many times
              </div>
            )}

            {scenario.media_type === "audio" && scenario.media_url && (
              <div className="bg-ink text-white p-5 border-b border-line space-y-3">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/70">
                  <Volume2 className="w-4 h-4" />
                  Audio evidence — press play
                </div>
                <audio
                  controls
                  className="w-full h-11 rounded-lg"
                  src={scenario.media_url}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {scenario.media_type === "image" && scenario.media_url && (
              <div className="bg-surface-sunken border-b border-line p-4 space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={scenario.media_url}
                  alt={scenario.title}
                  className="max-h-80 w-full object-cover rounded-xl border border-line"
                />
                <p className="text-[11px] text-ink-muted font-medium text-center">
                  Visual evidence — inspect landmarks and original context
                </p>
              </div>
            )}

            <div className="p-5 sm:p-6 space-y-3">
              <h2 className="text-xl font-black text-ink leading-snug">
                {scenario.title}
              </h2>
              {scenario.body_context && (
                <p className="text-[15px] text-ink-soft leading-relaxed bg-surface-sunken p-4 rounded-xl border border-line">
                  {scenario.body_context}
                </p>
              )}
            </div>
          </Card>
        ) : null}

        {/* ---- Your call ----------------------------------------------- */}
        {scenario && !feedback && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1 */}
            <Card accent={assessment ? "success" : "brand"}>
              <StepHeader
                n={1}
                done={!!assessment}
                title="What's your call?"
                hint="Pick the one that matches your gut, then justify it below."
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                {(
                  [
                    ["fake", "Likely fake", "or a scam", ShieldAlert, "danger"],
                    ["real", "Likely real", "it checks out", CheckCircle2, "success"],
                    ["evidence", "Not enough", "evidence yet", HelpCircle, "spark"],
                  ] as const
                ).map(([value, label, sub, Icon, tone]) => {
                  const on = assessment === value;
                  const active: Record<string, string> = {
                    danger: "bg-danger-50 border-danger-600 ring-4 ring-danger-100",
                    success:
                      "bg-success-50 border-success-600 ring-4 ring-success-100",
                    spark: "bg-spark-50 border-spark-600 ring-4 ring-spark-100",
                  };
                  const iconOn: Record<string, string> = {
                    danger: "bg-danger-600",
                    success: "bg-success-600",
                    spark: "bg-spark-600",
                  };
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setAssessment(value)}
                      className={`btn-press p-4 rounded-xl border-2 text-center transition-all ${
                        on
                          ? active[tone]
                          : "border-line bg-surface hover:border-line-strong"
                      }`}
                    >
                      <span
                        className={`w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-2 transition-colors ${
                          on
                            ? `${iconOn[tone]} text-white`
                            : "bg-surface-sunken text-ink-muted"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="block text-sm font-extrabold text-ink">
                        {label}
                      </span>
                      <span className="block text-[11px] text-ink-muted mt-0.5">
                        {sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-ink-muted mt-3">
                &ldquo;Not enough evidence&rdquo; is a real answer, not a cop-out
                — it is never counted against you.
              </p>
            </Card>

            {/* Step 2 */}
            <Card accent={reasoningOk ? "success" : "brand"}>
              <StepHeader
                n={2}
                done={reasoningOk}
                title="What convinced you?"
                hint="This is the part that gets graded — name the specific red flags."
              />

              <textarea
                rows={4}
                value={userReasoning}
                onChange={(e) => setUserReasoning(e.target.value)}
                placeholder="Artificial urgency, a domain that doesn't match, chain-forwarding demands…"
                className="w-full mt-4 p-3.5 border-2 border-line rounded-xl text-sm text-ink bg-surface placeholder:text-ink-faint focus:border-brand-600 focus:outline-none transition-colors"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs text-ink-muted">
                  Minimum 15 characters.
                </span>
                <span
                  className={`text-xs font-bold tabular-nums ${
                    reasoningOk ? "text-success-700" : "text-ink-muted"
                  }`}
                >
                  {userReasoning.trim().length}/15
                </span>
              </div>
            </Card>

            {/* Step 3 */}
            <Card accent={sourceOk ? "success" : "brand"}>
              <StepHeader
                n={3}
                done={sourceOk}
                title="Where did you check?"
                hint="Lateral reading — leaving the message to verify it is the whole skill. Paste a link, or tick the box if there was nothing to find."
              />

              <label
                htmlFor="noSourceFound"
                className="flex items-start gap-3 mt-4 bg-spark-50 p-3.5 rounded-xl border border-spark-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  id="noSourceFound"
                  checked={noSourceFound}
                  onChange={(e) => {
                    setNoSourceFound(e.target.checked);
                    if (e.target.checked) setSourceUrl("");
                  }}
                  className="mt-0.5 w-4 h-4 accent-spark-600 cursor-pointer shrink-0"
                />
                <span className="text-xs font-medium text-spark-700 leading-snug">
                  I searched official channels, but{" "}
                  <strong className="font-extrabold">
                    no official announcement exists
                  </strong>{" "}
                  for this claim.
                </span>
              </label>

              <div className="mt-3">
                <label
                  htmlFor="sourceUrl"
                  className="block text-xs font-extrabold text-ink mb-1.5"
                >
                  {noSourceFound
                    ? "Which official portal did you check?"
                    : "Verification source URL"}
                </label>
                <input
                  id="sourceUrl"
                  type="text"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder={
                    noSourceFound
                      ? "e.g. education.gov.in"
                      : "https://www.reuters.com/fact-check/…"
                  }
                  className="w-full p-3 border-2 border-line rounded-xl text-sm text-ink bg-surface placeholder:text-ink-faint focus:border-brand-600 focus:outline-none transition-colors"
                />
                {!noSourceFound && (
                  <p className="text-[11px] text-ink-muted mt-1.5">
                    Needs to be a full http(s) link, or tick the box above.
                  </p>
                )}
              </div>
            </Card>

            {/* Submit — and what it does. */}
            <Card>
              <p className="text-xs text-ink-muted mb-3 leading-relaxed">
                <strong className="text-ink">What happens next:</strong> your
                reasoning is scored, the real answer is revealed, and the attempt
                is saved to your profile. You can retry a different case straight
                after.
              </p>
              <Button
                type="submit"
                size="lg"
                full
                disabled={!canSubmit}
                loading={submitting}
                icon={Send}
              >
                {submitting ? "Checking your reasoning…" : "Submit my answer"}
              </Button>
              {!canSubmit && !submitting && (
                <p className="text-[11px] text-ink-muted mt-2 text-center">
                  {!assessment
                    ? "Pick a call in step 1 to continue."
                    : !reasoningOk
                    ? "Add a bit more reasoning in step 2."
                    : "Step 3 needs a full https:// link, or tick the box."}
                </p>
              )}
            </Card>
          </form>
        )}

        {/* ---- Result --------------------------------------------------- */}
        {feedback && (
          <div className="space-y-4 animate-fade-up">
            {/* The answer, released now that they've committed to one. */}
            <Card
              padded={false}
              className={
                feedback.wasCorrect
                  ? "border-success-100 shadow-lift"
                  : "border-line shadow-lift"
              }
            >
              <div
                className={`px-5 py-6 text-center text-white ${
                  feedback.wasCorrect ? "bg-success-600" : "bg-brand-600"
                }`}
              >
                <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-3">
                  {feedback.wasCorrect ? (
                    <Trophy className="w-7 h-7" />
                  ) : (
                    <HelpCircle className="w-7 h-7" />
                  )}
                </span>
                <h3 className="text-xl font-black">{feedback.verdictTitle}</h3>
                <p className="text-sm text-white/85 mt-1">
                  This one was{" "}
                  <strong className="uppercase tracking-wide">
                    {feedback.actualVerdict}
                  </strong>
                  .{" "}
                  {feedback.wasCorrect
                    ? "You called it correctly."
                    : "Your reasoning still counts."}
                </p>
                <div className="inline-flex items-baseline gap-1 mt-4 bg-white/15 px-4 py-2 rounded-xl">
                  <span className="text-2xl font-black tabular-nums">
                    {feedback.score}
                  </span>
                  <span className="text-sm font-bold text-white/70">/100</span>
                </div>
                <p className="text-[11px] text-white/70 mt-2 font-medium uppercase tracking-wider">
                  {feedback.gradedBy === "fallback"
                    ? "Recorded — AI coach unavailable"
                    : "Coach assessment complete"}
                </p>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                <div className="bg-surface-sunken p-4 rounded-xl border border-line">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 mb-2">
                    <MessageSquare className="w-3.5 h-3.5 text-brand-600" />
                    On your reasoning
                  </h4>
                  <p className="text-[15px] text-ink-soft italic leading-relaxed">
                    &ldquo;{feedback.personalizedFeedback}&rdquo;
                  </p>
                </div>

                <div className="bg-info-50 p-4 rounded-xl border border-info-100">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-info-700 flex items-center gap-1.5 mb-2">
                    <Search className="w-3.5 h-3.5" />
                    Source credibility audit
                  </h4>
                  <p className="text-[15px] text-info-700 leading-relaxed font-medium">
                    {feedback.sourceAudit}
                  </p>
                </div>

                {feedback.keyLesson && (
                  <p className="text-sm text-ink-soft">
                    <strong className="text-ink">Takeaway:</strong>{" "}
                    {feedback.keyLesson}
                  </p>
                )}

                {/* Attempts used to vanish silently. If one still does, say so. */}
                {!feedback.persisted && (
                  <div className="flex items-start gap-2 bg-spark-50 border border-spark-100 rounded-xl p-3 text-xs text-spark-700 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                    <span>
                      This attempt could not be saved, so it won&apos;t count
                      toward your profile or streak.
                    </span>
                  </div>
                )}

                <Button
                  onClick={handleNext}
                  size="lg"
                  full
                  icon={RefreshCw}
                  tone="brand"
                >
                  Try another case
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ---- Questions Bank ------------------------------------------- */}
        <Card accent="mentor">
          <SectionHeader
            icon={Users}
            tone="mentor"
            title="Questions Bank"
            subtitle="Situations written and tagged by learners. No AI checks them — their judgment is the check."
            right={
              <Button
                onClick={() => {
                  setShowBankModal(true);
                  setBankDone(false);
                  setBankError(null);
                }}
                tone="mentor"
                size="sm"
                icon={PlusCircle}
              >
                Submit
              </Button>
            }
          />

          <div className="mt-4">
            {bank.length === 0 ? (
              <EmptyState icon={Inbox} tone="mentor" title="Nothing in the bank yet">
                Complete a learning module and you can add the first one.
              </EmptyState>
            ) : (
              <ul className="space-y-2">
                {bank.map((b) => (
                  <li
                    key={b.id}
                    className="border border-line rounded-xl p-3.5 flex items-start gap-3"
                  >
                    <span className="w-8 h-8 rounded-lg bg-mentor-50 border border-mentor-100 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-mentor-600" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">{b.title}</p>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        {CATEGORY_LABEL[b.category]} · submitted by{" "}
                        {b.submitted_by_name}
                        {b.spotted_pct !== null && (
                          <>
                            {" · "}
                            <span className="text-success-700 font-bold">
                              {b.spotted_pct}% of learners spotted it
                            </span>
                          </>
                        )}
                        {b.spotted_pct === null && " · no attempts yet"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* ---- Submit-to-bank modal -------------------------------------- */}
        {showBankModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="New Questions Bank submission"
            className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-4 animate-fade-up"
          >
            <div className="bg-surface rounded-2xl max-w-lg w-full border border-line shadow-lift p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="text-base font-extrabold text-ink">
                  New submission
                </h3>
                <button
                  onClick={() => setShowBankModal(false)}
                  aria-label="Close"
                  className="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-surface-sunken"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {bankDone ? (
                <div className="text-center py-6 space-y-3">
                  <span className="w-12 h-12 rounded-2xl bg-success-50 border border-success-100 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6 text-success-600" />
                  </span>
                  <p className="text-sm font-extrabold text-ink">
                    Added to the Questions Bank
                  </p>
                  <p className="text-xs text-ink-muted">
                    It joins the shared pool for other learners.
                  </p>
                  <Button
                    onClick={() => setShowBankModal(false)}
                    variant="outline"
                    size="sm"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-ink-soft">
                    Write something brand-new — not one of the situations you
                    studied — then tag it yourself.
                  </p>

                  <div>
                    <label
                      htmlFor="bankTitle"
                      className="block text-xs font-extrabold text-ink mb-1.5"
                    >
                      Title
                    </label>
                    <input
                      id="bankTitle"
                      type="text"
                      value={bankTitle}
                      onChange={(e) => setBankTitle(e.target.value)}
                      placeholder="e.g. Local bank texts about a frozen account"
                      className="w-full p-3 border-2 border-line rounded-xl text-sm text-ink bg-surface placeholder:text-ink-faint focus:border-brand-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bankBody"
                      className="block text-xs font-extrabold text-ink mb-1.5"
                    >
                      What would they see?
                    </label>
                    <textarea
                      id="bankBody"
                      rows={4}
                      value={bankBody}
                      onChange={(e) => setBankBody(e.target.value)}
                      placeholder="Describe the post, message, or claim in full…"
                      className="w-full p-3 border-2 border-line rounded-xl text-sm text-ink bg-surface placeholder:text-ink-faint focus:border-brand-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bankCategory"
                      className="block text-xs font-extrabold text-ink mb-1.5"
                    >
                      Category
                    </label>
                    <select
                      id="bankCategory"
                      value={bankCategory}
                      onChange={(e) => setBankCategory(e.target.value)}
                      className="w-full p-3 border-2 border-line rounded-xl text-sm bg-surface text-ink focus:border-brand-600 focus:outline-none"
                    >
                      {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>

                  {bankError && (
                    <p className="text-xs text-danger-700 font-medium">
                      {bankError}
                    </p>
                  )}

                  <div className="pt-1">
                    <p className="text-xs font-extrabold text-ink mb-2">
                      Tag it before you submit — your judgment is the check.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleBankSubmit("fake")}
                        loading={bankBusy}
                        tone="danger"
                        variant="outline"
                      >
                        Fake
                      </Button>
                      <Button
                        onClick={() => handleBankSubmit("real")}
                        loading={bankBusy}
                        tone="success"
                        variant="outline"
                      >
                        Real
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

/** Numbered step heading that ticks over once the step is satisfied. */
function StepHeader({
  n,
  title,
  hint,
  done,
}: {
  n: number;
  title: string;
  hint: string;
  done: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black transition-colors ${
          done
            ? "bg-success-600 text-white"
            : "bg-brand-100 text-brand-800"
        }`}
      >
        {done ? <CheckCircle2 className="w-4 h-4" /> : n}
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-extrabold text-ink leading-tight">
          {title}
        </h3>
        <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">{hint}</p>
      </div>
    </div>
  );
}

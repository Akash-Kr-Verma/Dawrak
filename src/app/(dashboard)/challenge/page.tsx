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
"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChallenge } from "@/hooks/useChallenge";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CATEGORY_LABEL } from "@/types/challenge";
import {
  CheckCircle2,
  Volume2,
  MessageSquare,
  Share2,
  Globe,
  Search,
  Award,
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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Spot Today&apos;s Situation
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Analyze the claim, cite what you checked, and get AI Coach feedback.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {streak > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-900 rounded-full text-xs font-bold">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                Day {streak}
              </span>
            )}
            <button
              onClick={handleNext}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              New Claim
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
            {error}
          </div>
        )}

        {/* Scenario card */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-600">
              Finding a situation for you...
            </p>
          </div>
        ) : scenario ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
                  <Globe className="w-3 h-3 text-emerald-400" />
                  {scenario.source_channel || "Internet Claim"}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-300">
                  {scenario.original_publisher || "Unattributed"}
                </span>
              </div>

              {scenario.viral_reach && (
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-800/30">
                  <Share2 className="w-3 h-3" />
                  <span>{scenario.viral_reach}</span>
                </div>
              )}
            </div>

            {/* Questions Bank attribution — the prototype's "a mentor submitted
                this and tagged it themselves; no AI checked it". */}
            {scenario.origin === "questions_bank" && (
              <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-2.5 flex items-center gap-2 text-xs text-indigo-900">
                <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>
                  Submitted to the Questions Bank by{" "}
                  <strong>{scenario.submitted_by_name}</strong> and tagged by
                  them — no AI checked it.
                </span>
              </div>
            )}

            {scenario.source_channel === "WhatsApp Forward" && (
              <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-2.5 flex items-center justify-between text-xs text-emerald-900 font-medium">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center bg-emerald-600 text-white rounded-full p-1">
                    <Share2 className="w-3 h-3" />
                  </span>
                  <span className="font-bold text-emerald-800">
                    Forwarded many times
                  </span>
                </div>
              </div>
            )}

            {scenario.media_type === "audio" && scenario.media_url && (
              <div className="bg-slate-900 text-white p-5 border-b border-slate-700 space-y-3">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                  <span>Audio Evidence — Click Play to Listen</span>
                </div>
                <audio
                  controls
                  className="w-full h-11 rounded-lg bg-slate-800"
                  src={scenario.media_url}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {scenario.media_type === "image" && scenario.media_url && (
              <div className="bg-slate-100 border-b border-slate-200 p-4 flex flex-col items-center justify-center space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={scenario.media_url}
                  alt={scenario.title}
                  className="max-h-80 w-full object-cover rounded-xl border border-slate-300 shadow-sm"
                />
                <span className="text-[11px] text-slate-500 font-medium">
                  Visual Evidence • Inspect landmarks and original context
                </span>
              </div>
            )}

            <div className="p-6 space-y-4">
              <h2 className="text-xl font-black text-slate-900 leading-snug">
                {scenario.title}
              </h2>
              {scenario.body_context && (
                <p className="text-slate-700 leading-relaxed text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {scenario.body_context}
                </p>
              )}
            </div>
          </div>
        ) : null}

        {/* Assessment form */}
        {scenario && !feedback && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6"
          >
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-900">
                1. What is your initial assessment of this claim?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    ["fake", "Likely Fake / Scam", ShieldAlert, "rose"],
                    ["real", "Likely Real / Verified", CheckCircle2, "emerald"],
                    ["evidence", "Needs More Evidence", HelpCircle, "amber"],
                  ] as const
                ).map(([value, label, Icon, tone]) => {
                  const on = assessment === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAssessment(value)}
                      className={`p-3.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all ${
                        on
                          ? tone === "rose"
                            ? "bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20"
                            : tone === "emerald"
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20"
                            : "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          tone === "rose"
                            ? "text-rose-600"
                            : tone === "emerald"
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500">
                &quot;Needs more evidence&quot; is a real answer, not a cop-out —
                it is never counted against you.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">
                2. Explain your reasoning in your own words (required):
              </label>
              <p className="text-xs text-slate-500">
                Name specific red flags — artificial urgency, a domain that
                doesn&apos;t match, chain-forwarding demands. Minimum 15
                characters.
              </p>
              <textarea
                rows={4}
                value={userReasoning}
                onChange={(e) => setUserReasoning(e.target.value)}
                placeholder="Explain why you think this is true or false..."
                className="w-full p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none text-sm text-slate-900"
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-start space-x-3 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/60">
                <input
                  type="checkbox"
                  id="noSourceFound"
                  checked={noSourceFound}
                  onChange={(e) => {
                    setNoSourceFound(e.target.checked);
                    if (e.target.checked) setSourceUrl("");
                  }}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-amber-300 cursor-pointer"
                />
                <label
                  htmlFor="noSourceFound"
                  className="text-xs font-medium text-amber-900 cursor-pointer leading-snug"
                >
                  I searched official channels, but{" "}
                  <span className="font-bold underline text-amber-950">
                    no official announcement exists
                  </span>{" "}
                  for this claim.
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  {noSourceFound
                    ? "Which official portal did you check?"
                    : "Verification source URL (where did you check this?):"}
                </label>
                <input
                  type="text"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder={
                    noSourceFound
                      ? "e.g., education.gov.in"
                      : "https://www.reuters.com/fact-check/..."
                  }
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none text-sm text-slate-900"
                />
                {!noSourceFound && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Needs to be a full http(s) link, or tick the box above.
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !assessment || userReasoning.trim().length < 15}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>AI Coach auditing your reasoning...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>Submit for AI evaluation</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Result */}
        {feedback && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-5 animate-in fade-in duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {feedback.verdictTitle}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {feedback.gradedBy === "fallback"
                      ? "Recorded — AI coach unavailable"
                      : "AI Coach assessment complete"}
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-center">
                <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Score
                </span>
                <span className="text-lg font-black text-emerald-400">
                  {feedback.score}/100
                </span>
              </div>
            </div>

            {/* The answer, released now that they've committed to one. */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                feedback.wasCorrect
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              {feedback.wasCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <HelpCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-bold text-slate-900">
                  This one was{" "}
                  <span
                    className={
                      feedback.actualVerdict === "fake"
                        ? "text-rose-700"
                        : "text-emerald-700"
                    }
                  >
                    {feedback.actualVerdict}
                  </span>
                  .
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {feedback.wasCorrect
                    ? "You called it correctly."
                    : "Your reasoning still counts — read the coach's notes below."}
                </p>
              </div>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                Coach feedback on your reasoning
              </h4>
              <p className="text-sm text-slate-800 italic leading-relaxed">
                &ldquo;{feedback.personalizedFeedback}&rdquo;
              </p>
            </div>

            <div className="space-y-2 bg-indigo-50/60 p-4 rounded-xl border border-indigo-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-indigo-600" />
                Source credibility audit
              </h4>
              <p className="text-sm text-indigo-950 leading-relaxed font-medium">
                {feedback.sourceAudit}
              </p>
            </div>

            {feedback.keyLesson && (
              <p className="text-xs text-slate-600">
                <strong className="text-slate-800">Takeaway:</strong>{" "}
                {feedback.keyLesson}
              </p>
            )}

            {/* Attempts used to vanish silently. If one still does, say so. */}
            {!feedback.persisted && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  This attempt could not be saved, so it won&apos;t count toward
                  your profile or streak.
                </span>
              </div>
            )}

            <button
              onClick={handleNext}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try another situation</span>
            </button>
          </div>
        )}

        {/* Questions Bank */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Questions Bank
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Situations written and tagged by learners. No AI checks them —
                their judgment is the check.
              </p>
            </div>
            <button
              onClick={() => {
                setShowBankModal(true);
                setBankDone(false);
                setBankError(null);
              }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              Submit
            </button>
          </div>

          {bank.length === 0 ? (
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-4">
              Nothing in the bank yet. Complete a learning module and you can add
              the first one.
            </p>
          ) : (
            <div className="space-y-2">
              {bank.map((b) => (
                <div
                  key={b.id}
                  className="border border-slate-200 rounded-xl p-3.5 flex items-start gap-3"
                >
                  <Users className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900">{b.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {CATEGORY_LABEL[b.category]} · submitted by{" "}
                      {b.submitted_by_name}
                      {b.spotted_pct !== null && (
                        <>
                          {" · "}
                          <span className="text-emerald-700 font-medium">
                            {b.spotted_pct}% of learners spotted it
                          </span>
                        </>
                      )}
                      {b.spotted_pct === null && " · no attempts yet"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Submit-to-bank modal */}
        {showBankModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">
                  New submission
                </h3>
                <button
                  onClick={() => setShowBankModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {bankDone ? (
                <div className="text-center py-6 space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-900">
                    Added to the Questions Bank
                  </p>
                  <p className="text-xs text-slate-500">
                    It joins the shared pool for other learners.
                  </p>
                  <button
                    onClick={() => setShowBankModal(false)}
                    className="px-4 py-2 border-2 border-slate-900 text-slate-900 rounded-xl text-xs font-bold"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-600">
                    Write something brand-new — not one of the situations you
                    studied — then tag it yourself.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={bankTitle}
                      onChange={(e) => setBankTitle(e.target.value)}
                      placeholder="e.g. Local bank texts about a frozen account"
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      What would they see?
                    </label>
                    <textarea
                      rows={4}
                      value={bankBody}
                      onChange={(e) => setBankBody(e.target.value)}
                      placeholder="Describe the post, message, or claim in full..."
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Category
                    </label>
                    <select
                      value={bankCategory}
                      onChange={(e) => setBankCategory(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    >
                      {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>

                  {bankError && (
                    <p className="text-xs text-rose-600">{bankError}</p>
                  )}

                  <div>
                    <p className="text-xs font-bold text-slate-800 mb-2">
                      Tag it before you submit — your judgment is the check.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleBankSubmit("fake")}
                        disabled={bankBusy}
                        className="border-2 border-rose-500 text-rose-700 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                      >
                        {bankBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Fake
                      </button>
                      <button
                        onClick={() => handleBankSubmit("real")}
                        disabled={bankBusy}
                        className="border-2 border-emerald-600 text-emerald-700 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                      >
                        {bankBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Real
                      </button>
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

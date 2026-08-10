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
import Image from "next/image";
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
        <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div>
            <h1 className="text-2xl font-black text-[#1E1B4B] tracking-tight">
              Spot Today&apos;s Situation
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Analyze the claim, cite what you checked, and get AI Coach feedback.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {streak > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 rounded-full text-xs font-black shadow-sm">
                <div className="relative w-4 h-4">
                  <Image src="/asset/stat-streak-fire.png" alt="Streak Fire" fill className="object-contain" />
                </div>
                Day {streak} 🔥
              </span>
            )}
            <button
              onClick={handleNext}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#7C3AED] bg-white border border-indigo-200 rounded-full hover:bg-indigo-50 transition-all shadow-sm disabled:opacity-50 btn-bouncy"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              New Claim
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900">
            {error}
          </div>
        )}

        {/* Scenario card */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 shadow-lg shadow-indigo-500/5 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-600">
              Finding a situation for you...
            </p>
          </div>
        ) : scenario ? (
          <div className="bg-white rounded-3xl shadow-lg shadow-indigo-500/5 overflow-hidden">
            {/* Floating badge header instead of dark bar */}
            <div className="px-5 pt-5 pb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#BAE6FD] text-[#0369A1] font-bold text-[11px] uppercase tracking-wider shadow-sm">
                  <Globe className="w-3 h-3" />
                  {scenario.source_channel || "Internet Claim"}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600 font-semibold">
                  {scenario.original_publisher || "Unattributed"}
                </span>
              </div>

              {scenario.viral_reach && (
                <div className="flex items-center gap-1.5 text-[#7C3AED] font-bold bg-[#EDE9FE] px-3 py-1.5 rounded-full text-[11px]">
                  <Share2 className="w-3 h-3" />
                  <span>{scenario.viral_reach}</span>
                </div>
              )}
            </div>

            {/* Questions Bank attribution — the prototype's "a mentor submitted
                this and tagged it themselves; no AI checked it". */}
            {scenario.origin === "questions_bank" && (
              <div className="bg-[#EDE9FE] mx-5 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-xs text-[#5B21B6] mb-3">
                <Users className="w-3.5 h-3.5 text-[#7C3AED] shrink-0" />
                <span>
                  Submitted to the Questions Bank by{" "}
                  <strong>{scenario.submitted_by_name}</strong> and tagged by
                  them — no AI checked it.
                </span>
              </div>
            )}

            {scenario.source_channel === "WhatsApp Forward" && (
              <div className="bg-[#D1FAE5] mx-5 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-900 font-medium mb-3">
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
              <div className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white mx-5 rounded-2xl p-5 mb-3 space-y-3">
                <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider">
                  <Volume2 className="w-4 h-4 text-[#A3E635]" />
                  <span>Audio Evidence — Click Play to Listen</span>
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
              <div className="mx-5 mb-3 p-3 bg-slate-50 rounded-2xl flex flex-col items-center justify-center space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={scenario.media_url}
                  alt={scenario.title}
                  className="max-h-80 w-full object-cover rounded-xl border border-slate-200 shadow-sm"
                />
                <span className="text-[11px] text-slate-500 font-medium">
                  Visual Evidence • Inspect landmarks and original context
                </span>
              </div>
            )}

            <div className="p-6 space-y-4">
              <h2 className="text-xl font-black text-[#1E1B4B] leading-snug">
                {scenario.title}
              </h2>
              {scenario.body_context && (
                <p className="text-slate-700 leading-relaxed text-sm bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
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
            className="bg-white rounded-3xl p-6 shadow-lg shadow-indigo-500/5 space-y-6"
          >
            <div className="space-y-3">
              <label className="block text-sm font-black text-[#1E1B4B]">
                1. What is your initial assessment of this claim?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  ["fake", "Likely Fake / Scam", "/asset/icon-fake-cross.png", "#FDA4AF", "#FFE4E6", "#9F1239"],
                  ["real", "Likely Real / Verified", "/asset/icon-fact-check.png", "#A3E635", "#ECFCCB", "#365314"],
                  ["evidence", "Needs More Evidence", "/asset/icon-needs-evidence.png", "#BAE6FD", "#E0F2FE", "#0C4A6E"],
                ] as const).map(([value, label, imageSrc, borderColor, bgColor, textColor]) => {
                  const on = assessment === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAssessment(value)}
                      className={`p-4 rounded-2xl text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all btn-bouncy ${
                        on
                          ? "ring-2 ring-offset-2 shadow-md translate-y-0"
                          : "hover:translate-y-0.5 border-b-4"
                      }`}
                      style={{
                        backgroundColor: bgColor,
                        borderBottomColor: on ? "transparent" : borderColor,
                        color: textColor,
                        ...(on ? { ringColor: borderColor } : {}),
                      }}
                    >
                      <div className="relative w-8 h-8">
                        <Image src={imageSrc} alt={label} fill className="object-contain" />
                      </div>
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
              <label className="block text-sm font-black text-[#1E1B4B]">
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
                className="w-full p-3.5 border border-indigo-100 bg-indigo-50/30 rounded-2xl focus:ring-2 focus:ring-[#7C3AED]/30 focus:outline-none text-sm text-[#1E1B4B] transition-all"
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-indigo-100">
              <div className="flex items-start space-x-3 bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/60">
                <input
                  type="checkbox"
                  id="noSourceFound"
                  checked={noSourceFound}
                  onChange={(e) => {
                    setNoSourceFound(e.target.checked);
                    if (e.target.checked) setSourceUrl("");
                  }}
                  className="mt-0.5 w-4 h-4 text-[#7C3AED] rounded border-amber-300 cursor-pointer accent-[#7C3AED]"
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
                <label className="block text-xs font-bold text-[#1E1B4B] mb-1.5">
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
                  className="w-full p-3 border border-indigo-100 bg-indigo-50/30 rounded-2xl focus:ring-2 focus:ring-[#7C3AED]/30 focus:outline-none text-sm text-[#1E1B4B] transition-all"
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
              className="w-full py-3.5 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-full shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed btn-bouncy"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#A3E635]" />
                  <span>AI Coach auditing your reasoning...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#A3E635]" />
                  <span>Submit for AI evaluation</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Result */}
        {feedback && (
          <div className="bg-white rounded-3xl shadow-lg shadow-indigo-500/5 p-6 space-y-5 animate-fade-up">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1E1B4B]">
                    {feedback.verdictTitle}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {feedback.gradedBy === "fallback"
                      ? "Recorded — AI coach unavailable"
                      : "AI Coach assessment complete"}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white px-4 py-2 rounded-2xl text-center shadow-md">
                <span className="block text-[10px] text-indigo-200 uppercase tracking-wider font-bold">
                  Score
                </span>
                <span className="text-lg font-black text-[#A3E635]">
                  {feedback.score}/100
                </span>
              </div>
            </div>

            {/* The answer, released now that they've committed to one. */}
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 ${
                feedback.wasCorrect
                  ? "bg-[#ECFCCB] border-[#BEF264]"
                  : "bg-indigo-50 border-indigo-100"
              }`}
            >
              {feedback.wasCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-[#65A30D] shrink-0 mt-0.5" />
              ) : (
                <HelpCircle className="w-5 h-5 text-[#7C3AED] shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-bold text-[#1E1B4B]">
                  This one was{" "}
                  <span
                    className={
                      feedback.actualVerdict === "fake"
                        ? "text-[#E11D48]"
                        : "text-[#059669]"
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

            <div className="space-y-2 bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B21B6] flex items-center gap-1.5">
                <div className="relative w-5 h-5">
                  <Image src="/asset/icon-ai-coach.png" alt="AI Coach" fill className="object-contain" />
                </div>
                Coach feedback on your reasoning
              </h4>
              <p className="text-sm text-[#1E1B4B] italic leading-relaxed">
                &ldquo;{feedback.personalizedFeedback}&rdquo;
              </p>
            </div>

            <div className="space-y-2 bg-[#E0F2FE] p-4 rounded-2xl border border-[#BAE6FD]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0C4A6E] flex items-center gap-1.5">
                <Search className="w-4 h-4 text-[#0369A1]" />
                Source credibility audit
              </h4>
              <p className="text-sm text-[#0C4A6E] leading-relaxed font-medium">
                {feedback.sourceAudit}
              </p>
            </div>

            {feedback.keyLesson && (
              <p className="text-xs text-slate-600">
                <strong className="text-[#1E1B4B]">Takeaway:</strong>{" "}
                {feedback.keyLesson}
              </p>
            )}

            {/* Attempts used to vanish silently. If one still does, say so. */}
            {!feedback.persisted && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  This attempt could not be saved, so it won&apos;t count toward
                  your profile or streak.
                </span>
              </div>
            )}

            <button
              onClick={handleNext}
              className="w-full py-3 px-4 bg-[#A3E635] hover:bg-[#84CC16] text-slate-900 font-black rounded-full transition-all text-sm flex items-center justify-center gap-2 shadow-md shadow-lime-500/20 btn-bouncy"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try another situation</span>
            </button>
          </div>
        )}

        {/* Questions Bank */}
        <section className="bg-white rounded-3xl p-6 shadow-lg shadow-indigo-500/5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#1E1B4B]">
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
              className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-full text-xs font-bold inline-flex items-center gap-1.5 shrink-0 shadow-md shadow-indigo-500/20 btn-bouncy"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#A3E635]" />
              Submit
            </button>
          </div>

          {bank.length === 0 ? (
            <p className="text-xs text-slate-500 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
              Nothing in the bank yet. Complete a learning module and you can add
              the first one.
            </p>
          ) : (
            <div className="space-y-2">
              {bank.map((b) => (
                <div
                  key={b.id}
                  className="relative border border-indigo-100 rounded-2xl p-4 flex items-start gap-3 bg-indigo-50/30 ticket-notch overflow-hidden"
                >
                  <Users className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#1E1B4B]">{b.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {CATEGORY_LABEL[b.category]} · submitted by{" "}
                      {b.submitted_by_name}
                      {b.spotted_pct !== null && (
                        <>
                          {" · "}
                          <span className="text-[#059669] font-medium">
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
          <div className="fixed inset-0 bg-[#1E1B4B]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl shadow-indigo-500/20 p-6 space-y-4 animate-fade-up">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <h3 className="text-base font-black text-[#1E1B4B]">
                  New submission
                </h3>
                <button
                  onClick={() => setShowBankModal(false)}
                  className="text-slate-400 hover:text-[#7C3AED] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {bankDone ? (
                <div className="text-center py-6 space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-[#A3E635] mx-auto" />
                  <p className="text-sm font-bold text-[#1E1B4B]">
                    Added to the Questions Bank
                  </p>
                  <p className="text-xs text-slate-500">
                    It joins the shared pool for other learners.
                  </p>
                  <button
                    onClick={() => setShowBankModal(false)}
                    className="px-4 py-2 border-2 border-[#7C3AED] text-[#7C3AED] rounded-full text-xs font-bold btn-bouncy"
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
                    <label className="block text-xs font-bold text-[#1E1B4B] mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={bankTitle}
                      onChange={(e) => setBankTitle(e.target.value)}
                      placeholder="e.g. Local bank texts about a frozen account"
                      className="w-full p-2.5 border border-indigo-100 bg-indigo-50/30 rounded-2xl text-xs focus:ring-2 focus:ring-[#7C3AED]/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1E1B4B] mb-1">
                      What would they see?
                    </label>
                    <textarea
                      rows={4}
                      value={bankBody}
                      onChange={(e) => setBankBody(e.target.value)}
                      placeholder="Describe the post, message, or claim in full..."
                      className="w-full p-2.5 border border-indigo-100 bg-indigo-50/30 rounded-2xl text-xs focus:ring-2 focus:ring-[#7C3AED]/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1E1B4B] mb-1">
                      Category
                    </label>
                    <select
                      value={bankCategory}
                      onChange={(e) => setBankCategory(e.target.value)}
                      className="w-full p-2.5 border border-indigo-100 bg-indigo-50/30 rounded-2xl text-xs bg-white focus:ring-2 focus:ring-[#7C3AED]/30 focus:outline-none"
                    >
                      {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>

                  {bankError && (
                    <p className="text-xs text-[#E11D48]">{bankError}</p>
                  )}

                  <div>
                    <p className="text-xs font-bold text-[#1E1B4B] mb-2">
                      Tag it before you submit — your judgment is the check.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleBankSubmit("fake")}
                        disabled={bankBusy}
                        className="bg-[#FFE4E6] border-b-4 border-[#FDA4AF] text-[#9F1239] py-2.5 rounded-2xl text-xs font-bold disabled:opacity-50 inline-flex items-center justify-center gap-1.5 btn-bouncy hover:translate-y-0.5 transition-all"
                      >
                        {bankBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Fake
                      </button>
                      <button
                        onClick={() => handleBankSubmit("real")}
                        disabled={bankBusy}
                        className="bg-[#ECFCCB] border-b-4 border-[#A3E635] text-[#365314] py-2.5 rounded-2xl text-xs font-bold disabled:opacity-50 inline-flex items-center justify-center gap-1.5 btn-bouncy hover:translate-y-0.5 transition-all"
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

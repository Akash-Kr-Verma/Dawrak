// src/app/teach/[token]/page.tsx
//
// The public side of mentoring: someone with no account opens a link a mentor
// sent them, judges the situation, and says why. Their answer goes to the
// mentor, who replies personally.
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
import { Loader2, ShieldAlert, Users, Check } from "lucide-react";

type Step = "loading" | "gone" | "question" | "waiting" | "reply";

const receiptKey = (token: string) => `pyp_share_receipt_${token}`;

export default function TeachPage({ params }: { params: { token: string } }) {
  const { token } = params;

  const [step, setStep] = useState<Step>("loading");
  const [link, setLink] = useState<PublicShareLink | null>(null);
  const [warningAccepted, setWarningAccepted] = useState(false);

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
      setLink(row as PublicShareLink);

      // Coming back to a link already answered on this device picks up where
      // it left off rather than asking the same question twice.
      const saved =
        typeof window !== "undefined"
          ? window.localStorage.getItem(receiptKey(token))
          : null;
      if (saved) {
        setReceipt(saved);
        setStep("waiting");
      } else {
        setStep("question");
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
      window.localStorage.setItem(receiptKey(token), r);
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
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (step === "gone" || !link) {
    return (
      <Shell>
        <div className="text-center py-16 space-y-3">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-slate-500" />
          </div>
          <h1 className="text-lg font-black text-slate-900">
            This link isn&apos;t active
          </h1>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            The person who shared it may have turned it off, or the address was
            copied incompletely.
          </p>
        </div>
      </Shell>
    );
  }

  const echo = [
    choice === "positive"
      ? link.verdict_labels?.positive ?? "Real"
      : link.verdict_labels?.negative ?? "Fake",
    ...Array.from(chips).map(chipLabel),
  ].join(" · ");

  return (
    <Shell>
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-600 mx-auto mb-4 flex items-center justify-center">
          <Users className="w-6 h-6 text-emerald-700" />
        </div>
        <p className="text-slate-600 text-sm">
          <span className="font-bold text-slate-900">{link.mentor_name}</span>{" "}
          wants to share something they learned with you
        </p>
      </div>

      {/* Content warning, where the module carries one. Shown before the
          situation itself, and it has to be accepted to continue. */}
      {link.content_warning && !warningAccepted && step === "question" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 text-center space-y-3">
          <ShieldAlert className="w-6 h-6 text-amber-600 mx-auto" />
          <p className="text-sm text-amber-900">
            {link.content_warning_text ??
              "This one covers a difficult subject."}
          </p>
          <button
            onClick={() => setWarningAccepted(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
          >
            I&apos;m ready
          </button>
        </div>
      )}

      {step === "question" && (!link.content_warning || warningAccepted) && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="p-4 border-b border-slate-100">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">
                Take a look at this
              </p>
            </div>
            <div className="p-6">
              <h1 className="text-lg font-bold leading-snug mb-3 text-slate-900">
                {link.module_title}
              </h1>
              <p className="text-slate-600 text-sm leading-relaxed">
                {link.prompt_text}
              </p>
            </div>
          </div>

          <p className="text-center font-bold mb-4 text-slate-900">
            {link.question_variant ?? "What do you think?"}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {(["negative", "positive"] as const).map((side) => {
              const label =
                side === "positive"
                  ? link.verdict_labels?.positive ?? "Real"
                  : link.verdict_labels?.negative ?? "Fake";
              const selected = choice === side;
              return (
                <button
                  key={side}
                  onClick={() => setChoice(side)}
                  className={`border-2 py-3 rounded-xl font-bold text-sm transition-colors ${
                    selected
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "border-emerald-700 text-emerald-800 hover:bg-emerald-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {choice && (
            <div className="animate-in fade-in duration-200">
              <p className="font-bold mb-2 text-slate-900 text-sm">
                What made you think that?
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {REASON_CHIPS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleChip(c.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      chips.has(c.id)
                        ? "bg-emerald-700 text-white border-emerald-700"
                        : "border-slate-300 text-slate-700 hover:border-slate-400"
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
                className="w-full min-h-[80px] p-4 rounded-xl border-2 border-slate-200 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              {submitError && (
                <p className="text-xs text-rose-600 mb-3">{submitError}</p>
              )}
              <button
                onClick={handleSubmit}
                disabled={!ready || submitting}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Send to {link.mentor_name}
              </button>
              <p className="text-[11px] text-slate-500 text-center mt-3">
                There&apos;s no automatic answer key — {link.mentor_name} will
                reply personally, in their own words.
              </p>
            </div>
          )}
        </>
      )}

      {step === "waiting" && (
        <>
          <SentCard text={answer ? formatAnswer(answer) : echo} />
          <div className="bg-slate-50 rounded-2xl p-8 text-center border border-slate-200">
            <div className="flex justify-center gap-1 mb-4">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <p className="font-bold mb-1 text-slate-900">
              {link.mentor_name} is reading your answer
            </p>
            <p className="text-sm text-slate-500">
              They reply personally — no bot, no automatic answer key. This page
              updates itself, so you can leave it open or come back to the link
              later.
            </p>
          </div>
        </>
      )}

      {step === "reply" && answer && (
        <>
          <SentCard text={formatAnswer(answer)} />
          <div className="bg-white rounded-2xl shadow-sm border-2 border-emerald-700 p-6 mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-600 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">
                {answer.mentor_name} replied
              </p>
            </div>
            <p className="text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap">
              {answer.mentor_reply}
            </p>
          </div>

          <div className="text-center bg-emerald-800 text-white rounded-2xl p-6">
            <p className="font-bold mb-1">Want to get better at spotting these?</p>
            <p className="text-sm text-white/80 mb-4">
              Join Play Your Part — free, and you can start teaching others too.
            </p>
            <a
              href="/login"
              className="block bg-amber-400 text-amber-950 px-6 py-3 rounded-xl font-bold w-full"
            >
              Join Play Your Part
            </a>
          </div>
        </>
      )}
    </Shell>
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-2">
        What you sent
      </p>
      <p className="text-sm text-slate-700">{text || "—"}</p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <Users className="w-5 h-5 text-emerald-700" />
          <span className="font-bold text-emerald-800 tracking-tight">
            Play Your Part
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

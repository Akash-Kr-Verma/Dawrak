// src/app/(dashboard)/mentor/page.tsx
//
// Mentor Hub.
//
// Eligibility is per-module: finish a module and you can mentor that module,
// straight away, without finishing the other nine. This replaces the old
// `user_module_progress.completed_lessons >= 5` gate, which counted "lessons"
// the finalized 10-module system does not have and lived in a column that
// existed in no migration. See supabase/migrations/0003_mentoring.sql.
//
// The Hub is now one loop and one loop only:
//
//   share a module you finished  →  someone answers it  →  it lands in
//   Pending Reviews  →  you reply personally  →  their branch joins the tree
//
// The offline half — "Log Teaching Proof", a self-reported session with a photo
// that was never uploaded anywhere — is gone. Sessions already logged are still
// shown in the tree, because they are real rows somebody entered; there is just
// no longer a way to add more. The Ripple Tree grows from shares now, which is
// the half of the product that actually verifies itself.
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMentorHub } from "@/hooks/useMentor";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { chipLabel } from "@/types/mentor";
import type { MentorableModule, PendingReview } from "@/types/mentor";
import {
  Users,
  Share2,
  Loader2,
  Sparkles,
  UserPlus,
  Copy,
  Check,
  X,
  Link2,
  MessageSquare,
  Send,
  Lock,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default function MentorHubPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    mentorable,
    sessions,
    pending,
    answered,
    loading,
    error,
    createShareLink,
    replyToResponse,
  } = useMentorHub(user?.id);

  // Share dialog
  const [shareTarget, setShareTarget] = useState<MentorableModule | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  // Review composer, keyed by response id
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [openReview, setOpenReview] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showAnswered, setShowAnswered] = useState(false);

  const openShare = useCallback(
    async (m: MentorableModule) => {
      setShareTarget(m);
      setShareError(null);
      setCopied(false);
      setCopyFailed(false);
      setShareToken(m.active_share_token);
      if (!m.active_share_token) {
        setShareBusy(true);
        try {
          setShareToken(await createShareLink(m.module_id));
        } catch (e: any) {
          setShareError(e?.message ?? "Could not create a link.");
        } finally {
          setShareBusy(false);
        }
      }
    },
    [createShareLink]
  );

  // Deep link from the end of a module: /mentor?share=<slug> opens the share
  // dialog for the module just finished. Read off window rather than through
  // useSearchParams, which would need a Suspense boundary around this page.
  const [shareSlugWanted, setShareSlugWanted] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const slug = new URLSearchParams(window.location.search).get("share");
    if (slug) setShareSlugWanted(slug);
  }, []);
  useEffect(() => {
    if (!shareSlugWanted || mentorable.length === 0) return;
    const m = mentorable.find((x) => x.slug === shareSlugWanted);
    setShareSlugWanted(null);
    window.history.replaceState(null, "", "/mentor");
    if (m) openShare(m);
  }, [shareSlugWanted, mentorable, openShare]);

  const shareUrl =
    shareToken && typeof window !== "undefined"
      ? `${window.location.origin}/teach/${shareToken}`
      : "";

  // navigator.clipboard is undefined on any non-secure origin — which is every
  // phone opening this over http://<lan-ip>:3000 — and writeText() rejects when
  // the document is not focused. Both used to surface as an unhandled runtime
  // error thrown out of a click handler. Neither is a reason to break the page:
  // the link is on screen and selectable regardless.
  const handleCopyLink = async () => {
    if (!shareUrl) return;
    setCopyFailed(false);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        throw new Error("clipboard unavailable");
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyFailed(true);
      // Select the text so a manual copy is one keystroke away.
      const input = document.getElementById(
        "share-url-input"
      ) as HTMLInputElement | null;
      input?.select();
    }
  };

  const handleReply = async (responseId: string) => {
    const draft = (replyDrafts[responseId] ?? "").trim();
    if (!draft) return;
    setReplyingTo(responseId);
    setReviewError(null);
    try {
      await replyToResponse(responseId, draft);
      setReplyDrafts((d) => ({ ...d, [responseId]: "" }));
      setOpenReview(null);
    } catch (e: any) {
      setReviewError(e?.message ?? "Could not send that reply.");
    } finally {
      setReplyingTo(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  // Everyone this mentor has actually reached: one branch per person who opened
  // a shared link and answered, plus any offline session logged before that
  // feature was removed.
  const reached = [...pending, ...answered];
  const reachCount = reached.length + sessions.length;

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Mentor Hub
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Finish a module and you can mentor it right away.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-900">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Community Beacon ({reachCount} People Reached)</span>
          </div>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
            {error}
          </div>
        )}

        {/* ---- Pending Reviews ------------------------------------------ */}
        <section className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-indigo-500 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              Pending Reviews
            </h2>
            {pending.length > 0 && (
              <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                {pending.length}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-4">
            People you shared a link with have answered. They are waiting on you
            personally — there is no automatic answer key on their end.
          </p>

          {reviewError && (
            <p className="text-xs text-rose-600 mb-3">{reviewError}</p>
          )}

          {pending.length === 0 ? (
            <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 text-center">
              <Clock className="w-5 h-5 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 mb-1">
                Nothing waiting on you
              </p>
              <p className="text-[11px] text-slate-500">
                Share a module below. When someone answers it, their explanation
                shows up here for you to reply to.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((p) => {
                const isOpen = openReview === p.id;
                return (
                  <div
                    key={p.id}
                    className="border border-slate-200 rounded-xl bg-slate-50/60 overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenReview(isOpen ? null : p.id)}
                      className="w-full flex items-center gap-2 p-4 text-left hover:bg-slate-100/60 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                        <Link2 className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 leading-tight">
                          Someone from your shared link
                        </p>
                        <p className="text-[11px] text-slate-500 italic truncate">
                          {p.module_title} · not a member yet ·{" "}
                          {formatWhen(p.created_at)}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full shrink-0">
                        Awaiting you
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-200">
                        <Submission review={p} />

                        <div>
                          <label className="block text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-1.5">
                            Your reply
                          </label>
                          <textarea
                            rows={4}
                            value={replyDrafts[p.id] ?? ""}
                            onChange={(e) =>
                              setReplyDrafts((d) => ({
                                ...d,
                                [p.id]: e.target.value,
                              }))
                            }
                            placeholder="Reply in your own words — what did they get right, and what did they miss?"
                            className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            They see this on the same link they answered on.
                            Sending it marks the review complete.
                          </p>
                        </div>

                        <button
                          onClick={() => handleReply(p.id)}
                          disabled={
                            replyingTo === p.id ||
                            !(replyDrafts[p.id] ?? "").trim()
                          }
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {replyingTo === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          Send reply
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Reviews already answered. Collapsed, because the point of the
              section is what still needs the mentor. */}
          {answered.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowAnswered((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {answered.length} review{answered.length === 1 ? "" : "s"}{" "}
                completed
                {showAnswered ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showAnswered && (
                <div className="space-y-3 mt-3 animate-in fade-in duration-200">
                  {answered.map((a) => (
                    <div
                      key={a.id}
                      className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white border border-emerald-200 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 leading-tight">
                            Someone from your shared link
                          </p>
                          <p className="text-[11px] text-slate-500 italic truncate">
                            {a.module_title} · replied {formatWhen(a.replied_at)}
                          </p>
                        </div>
                      </div>
                      <Submission review={a} />
                      <div className="bg-white border border-emerald-200 rounded-xl p-3">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-1">
                          You replied
                        </p>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap">
                          {a.mentor_reply}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ---- Share a module you've mastered ---------------------------- */}
        <section className="bg-emerald-50/60 border-2 border-emerald-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-emerald-700" />
            <h2 className="text-base font-black text-emerald-900">
              Share a situation you&apos;ve mastered
            </h2>
          </div>
          <p className="text-xs text-slate-600 mb-4">
            Pick something you&apos;ve already completed and send it to someone{" "}
            <strong>outside Play Your Part</strong> — no account needed for them
            to open it. Their answer comes back to you here.
          </p>

          {mentorable.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
              <Lock className="w-5 h-5 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 mb-1">
                Nothing to mentor yet
              </p>
              <p className="text-[11px] text-slate-500">
                Complete any module in the Learn tab and it appears here — one
                is enough.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {mentorable.map((m) => (
                <div
                  key={m.module_id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {m.title}
                      </p>
                      {m.active_share_token && (
                        <p className="text-[10px] text-emerald-700 font-medium">
                          Link active
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openShare(m)}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shrink-0 inline-flex items-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ---- Ripple Tree ----------------------------------------------- */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between min-h-[380px]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-900" />
              <h2 className="text-base font-black text-slate-900">
                Your Ripple Tree
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              One branch per person you&apos;ve mentored
            </span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-8">
            {reachCount === 0 ? (
              <div className="text-center max-w-sm space-y-3 px-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
                  <UserPlus className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Your Tree is Waiting for Its First Seed
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Share a module you&apos;ve completed. The moment someone opens
                  that link and sends back their reasoning, their branch grows
                  here.
                </p>
              </div>
            ) : (
              <div className="w-full space-y-6">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-900 text-white font-black text-base rounded-full flex items-center justify-center shadow-lg ring-4 ring-emerald-100 z-10">
                    You
                  </div>
                  <div className="w-0.5 h-6 bg-slate-300"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  {reached.map((r) => (
                    <div
                      key={r.id}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 shadow-sm animate-in fade-in zoom-in duration-300 ${
                        r.mentor_reply
                          ? "border-emerald-200 bg-emerald-50/40"
                          : "border-indigo-200 bg-indigo-50/40"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg text-white flex items-center justify-center shrink-0 ${
                          r.mentor_reply ? "bg-emerald-600" : "bg-indigo-600"
                        }`}
                      >
                        <Link2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            Shared link
                          </h4>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                              r.mentor_reply
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-indigo-100 text-indigo-800"
                            }`}
                          >
                            {r.mentor_reply ? "Mentored" : "Awaiting you"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 capitalize">
                          Answered &ldquo;{r.learner_verdict ?? "—"}&rdquo;
                        </p>
                        <p className="text-[11px] text-emerald-900 font-medium truncate mt-1">
                          📚 {r.module_title}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Sessions logged in person before that flow was retired.
                      Read-only: real rows, no way to add more. */}
                  {sessions.map((node) => (
                    <div
                      key={node.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start gap-3 shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-700 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                        {(node.learner_name ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {node.learner_name ?? "Someone"}
                          </h4>
                          <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.5 rounded shrink-0">
                            In person
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {node.relationship ?? "—"}
                        </p>
                        {node.topic_taught && (
                          <p className="text-[11px] text-slate-700 font-medium truncate mt-1">
                            📚 {node.topic_taught}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              {reachCount > 0
                ? `Your Ripple Tree has reached ${reachCount} secondary learner${
                    reachCount === 1 ? "" : "s"
                  }.`
                : "Share a module link above to plant the first branch."}
            </span>
          </div>
        </div>

        {/* ---- Share link modal ------------------------------------------ */}
        {shareTarget && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-black text-slate-900">
                    Share with someone new
                  </h3>
                </div>
                <button
                  onClick={() => setShareTarget(null)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-1">
                  Situation
                </p>
                <p className="text-xs text-slate-800 font-medium">
                  {shareTarget.title}
                </p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Anyone can open this link without an account. They&apos;ll write
                what they think and why — then it lands in your{" "}
                <strong>Pending Reviews</strong>, and you reply personally. They
                are never shown the answer.
              </p>

              {shareBusy && (
                <div className="flex justify-center py-3">
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                </div>
              )}

              {shareError && (
                <p className="text-xs text-rose-600">{shareError}</p>
              )}

              {shareUrl && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <input
                      id="share-url-input"
                      type="text"
                      readOnly
                      value={shareUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="bg-transparent text-xs text-slate-700 font-mono w-full focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors flex items-center gap-1"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  {copyFailed && (
                    <p className="text-[11px] text-amber-700">
                      This browser wouldn&apos;t let the page copy for you — the
                      link is selected above, copy it by hand.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

/** What the recipient actually sent: their verdict, the prompts they picked,
 *  and anything they wrote themselves. */
function Submission({ review }: { review: PendingReview }) {
  const chips = review.reason_chips ?? [];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">
        What they sent
      </p>
      <p className="text-xs text-slate-700">
        <span className="font-bold capitalize">
          {review.learner_verdict ?? "—"}
        </span>
        {chips.length > 0 && (
          <span className="text-slate-500">
            {" · "}
            {chips.map(chipLabel).join(" · ")}
          </span>
        )}
      </p>
      {review.learner_reasoning ? (
        <p className="text-xs text-slate-600 italic leading-relaxed whitespace-pre-wrap">
          &ldquo;{review.learner_reasoning}&rdquo;
        </p>
      ) : (
        <p className="text-xs text-slate-400 italic">
          They picked reasons but didn&apos;t write anything of their own.
        </p>
      )}
    </div>
  );
}

function formatWhen(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

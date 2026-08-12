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
// That loop is drawn at the top of the screen rather than left for the reader
// to infer from the order of the cards, because it is the part of the product
// nobody guesses on their own.
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
  Card,
  SectionHeader,
  Badge,
  Button,
  LinkButton,
  EmptyState,
  PageLoader,
  PageHeader,
} from "@/components/ui";
import {
  Users,
  Share2,
  Loader2,
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
  Heart,
  PenLine,
  ArrowRight,
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

  if (authLoading || loading) return <PageLoader label="Loading your hub" />;

  // Everyone this mentor has actually reached: one branch per person who opened
  // a shared link and answered, plus any offline session logged before that
  // feature was removed.
  const reached = [...pending, ...answered];
  const reachCount = reached.length + sessions.length;

  return (
    <ProtectedRoute>
      <div className="space-y-5 animate-fade-up">
        <PageHeader
          title="Mentor Hub"
          subtitle="Finish a situation and you can teach it straight away!"
          right={
            <Badge tone="mentor" icon={Heart} className="px-3 py-1.5">
              {reachCount} {reachCount === 1 ? "person" : "people"} reached
            </Badge>
          }
        />

        {/* ---- The loop, drawn ---------------------------------------- */}
        <FlowStrip
          pendingCount={pending.length}
          mentorableCount={mentorable.length}
        />

        {error && (
          <div className="bg-spark-50 border border-spark-100 rounded-2xl p-4 text-sm text-spark-700 font-medium">
            {error}
          </div>
        )}

        {/* ---- Pending Reviews ---------------------------------------- */}
        <Card accent="brand">
          <SectionHeader
            icon={MessageSquare}
            tone="brand"
            title="Waiting on you"
            subtitle="Someone answered a link you shared. There is no answer key on their end — your reply is the feedback."
            right={
              pending.length > 0 ? (
                <Badge tone="brand" solid>
                  {pending.length}
                </Badge>
              ) : undefined
            }
          />

          {reviewError && (
            <p className="text-xs text-danger-700 font-medium mt-3">
              {reviewError}
            </p>
          )}

          <div className="mt-4">
            {pending.length === 0 ? (
              <EmptyState icon={Clock} tone="brand" title="Nothing waiting on you">
                Share a situation below. When someone answers it, their reasoning
                shows up here for you to reply to.
              </EmptyState>
            ) : (
              <div className="space-y-3">
                {pending.map((p) => {
                  const isOpen = openReview === p.id;
                  return (
                    <div
                      key={p.id}
                      className="border border-line rounded-xl bg-surface-sunken overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenReview(isOpen ? null : p.id)}
                        aria-expanded={isOpen}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-brand-50 transition-colors"
                      >
                        <span className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                          <Link2 className="w-4 h-4 text-brand-700" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-ink leading-tight">
                            Someone from your shared link
                          </span>
                          <span className="block text-xs text-ink-muted truncate mt-0.5">
                            {p.module_title} · not a member yet ·{" "}
                            {formatWhen(p.created_at)}
                          </span>
                        </span>
                        <Badge tone="spark" className="shrink-0 hidden sm:inline-flex">
                          Awaiting you
                        </Badge>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-ink-muted shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-ink-muted shrink-0" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 space-y-3 animate-fade-up">
                          <Submission review={p} />

                          <div>
                            <label
                              htmlFor={`reply-${p.id}`}
                              className="block text-[11px] uppercase tracking-wide text-ink-muted font-extrabold mb-1.5"
                            >
                              Your reply
                            </label>
                            <textarea
                              id={`reply-${p.id}`}
                              rows={4}
                              value={replyDrafts[p.id] ?? ""}
                              onChange={(e) =>
                                setReplyDrafts((d) => ({
                                  ...d,
                                  [p.id]: e.target.value,
                                }))
                              }
                              placeholder="What did they get right, and what did they miss?"
                              className="w-full p-3 border-2 border-line rounded-xl text-sm bg-surface text-ink placeholder:text-ink-faint focus:border-brand-600 focus:outline-none transition-colors"
                            />
                            <p className="text-[11px] text-ink-muted mt-1.5">
                              They see this on the same link they answered on.
                              Sending it marks the review complete.
                            </p>
                          </div>

                          <Button
                            onClick={() => handleReply(p.id)}
                            disabled={!(replyDrafts[p.id] ?? "").trim()}
                            loading={replyingTo === p.id}
                            icon={Send}
                            size="sm"
                          >
                            Send reply
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reviews already answered. Collapsed, because the point of the
              section is what still needs the mentor. */}
          {answered.length > 0 && (
            <div className="mt-4 pt-4 border-t border-line">
              <button
                onClick={() => setShowAnswered((v) => !v)}
                aria-expanded={showAnswered}
                className="flex items-center gap-1.5 text-xs font-extrabold text-success-700 hover:text-success-800"
              >
                <CheckCircle2 className="w-4 h-4" />
                {answered.length} review{answered.length === 1 ? "" : "s"}{" "}
                completed
                {showAnswered ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showAnswered && (
                <div className="space-y-3 mt-3 animate-fade-up">
                  {answered.map((a) => (
                    <div
                      key={a.id}
                      className="border border-success-100 bg-success-50 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-surface border border-success-100 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-success-600" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-ink leading-tight">
                            Someone from your shared link
                          </p>
                          <p className="text-xs text-ink-muted truncate">
                            {a.module_title} · replied {formatWhen(a.replied_at)}
                          </p>
                        </div>
                      </div>
                      <Submission review={a} />
                      <div className="bg-surface border border-success-100 rounded-xl p-3">
                        <p className="text-[11px] uppercase tracking-wide text-ink-muted font-extrabold mb-1">
                          You replied
                        </p>
                        <p className="text-sm text-ink-soft whitespace-pre-wrap leading-relaxed">
                          {a.mentor_reply}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* ---- Share a module you've mastered -------------------------- */}
        <Card accent="mentor">
          <SectionHeader
            icon={Share2}
            tone="mentor"
            title="Share a module you've mastered"
            subtitle="Send it to someone outside Dawrak — they need no account to open it. Their answer comes back to you above."
          />

          <div className="mt-4">
            {mentorable.length === 0 ? (
              <EmptyState
                icon={Lock}
                tone="mentor"
                title="Nothing to mentor yet"
                action={
                  <LinkButton
                    href="/learn"
                    tone="mentor"
                    size="sm"
                    iconRight={ArrowRight}
                  >
                    Go to Learn
                  </LinkButton>
                }
              >
                Complete any situation in the Learn tab and it appears here — one
                is enough.
              </EmptyState>
            ) : (
              <ul className="space-y-2">
                {mentorable.map((m) => (
                  <li
                    key={m.module_id}
                    className="bg-surface p-3.5 rounded-xl border border-line flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-success-50 border border-success-100 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-success-600" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink truncate">
                          {m.title}
                        </p>
                        {m.active_share_token && (
                          <p className="text-[11px] text-mentor-700 font-bold">
                            Link active
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => openShare(m)}
                      tone="mentor"
                      size="sm"
                      icon={Share2}
                      className="shrink-0"
                    >
                      Share
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* ---- Ripple Tree -------------------------------------------- */}
        <Card>
          <SectionHeader
            icon={Users}
            tone="success"
            title="Your ripple tree"
            subtitle="One branch per person you've reached."
          />

          <div className="mt-5">
            {reachCount === 0 ? (
              <EmptyState
                icon={UserPlus}
                tone="success"
                title="Waiting for its first branch"
              >
                Share a situation you&apos;ve completed. The moment someone opens
                that link and sends back their reasoning, their branch grows
                here.
              </EmptyState>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-brand-600 text-white font-black text-sm rounded-full flex items-center justify-center shadow-pop ring-4 ring-brand-100">
                    You
                  </div>
                  <div className="w-0.5 h-6 bg-line-strong" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {reached.map((r) => (
                    <div
                      key={r.id}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 animate-grow-in ${
                        r.mentor_reply
                          ? "border-success-100 bg-success-50"
                          : "border-brand-100 bg-brand-50"
                      }`}
                    >
                      <span
                        className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 ${
                          r.mentor_reply ? "bg-success-600" : "bg-brand-600"
                        }`}
                      >
                        <Link2 className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-extrabold text-ink truncate">
                            Shared link
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              r.mentor_reply
                                ? "bg-success-100 text-success-800"
                                : "bg-brand-100 text-brand-800"
                            }`}
                          >
                            {r.mentor_reply ? "Mentored" : "Awaiting you"}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-muted truncate mt-0.5 capitalize">
                          Answered &ldquo;{r.learner_verdict ?? "—"}&rdquo;
                        </p>
                        <p className="text-[11px] text-ink-soft font-medium truncate mt-1">
                          {r.module_title}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Sessions logged in person before that flow was retired.
                      Read-only: real rows, no way to add more. */}
                  {sessions.map((node) => (
                    <div
                      key={node.id}
                      className="p-3.5 rounded-xl border border-line bg-surface-sunken flex items-start gap-3"
                    >
                      <span className="w-10 h-10 rounded-xl bg-ink-muted text-white font-bold flex items-center justify-center shrink-0 text-sm">
                        {(node.learner_name ?? "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-extrabold text-ink truncate">
                            {node.learner_name ?? "Someone"}
                          </h4>
                          <span className="text-[10px] bg-line text-ink-soft font-bold px-1.5 py-0.5 rounded shrink-0">
                            In person
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-muted truncate mt-0.5">
                          {node.relationship ?? "—"}
                        </p>
                        {node.topic_taught && (
                          <p className="text-[11px] text-ink-soft font-medium truncate mt-1">
                            {node.topic_taught}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-ink-muted font-medium text-center pt-2 border-t border-line">
                  Your ripple tree has reached {reachCount} secondary learner
                  {reachCount === 1 ? "" : "s"}.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* ---- Share link modal ---------------------------------------- */}
        {shareTarget && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Share this situation"
            className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-4 animate-fade-up"
          >
            <div className="bg-surface rounded-2xl max-w-md w-full border border-line shadow-lift p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-mentor-50 border border-mentor-100 flex items-center justify-center">
                    <Share2 className="w-4 h-4 text-mentor-600" />
                  </span>
                  <h3 className="text-base font-extrabold text-ink">
                    Share with someone new
                  </h3>
                </div>
                <button
                  onClick={() => setShareTarget(null)}
                  aria-label="Close"
                  className="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-surface-sunken"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-surface-sunken rounded-xl p-3 border border-line">
                <p className="text-[11px] uppercase tracking-wide text-ink-muted font-extrabold mb-1">
                  Situation
                </p>
                <p className="text-sm text-ink font-bold">{shareTarget.title}</p>
              </div>

              <p className="text-sm text-ink-soft leading-relaxed">
                Anyone can open this link without an account. They&apos;ll walk
                the same screens you did and write what they think — then it
                lands in <strong className="text-ink">Waiting on you</strong>,
                and you reply personally. They are never shown the answer.
              </p>

              {shareBusy && (
                <div className="flex justify-center py-3">
                  <Loader2 className="w-5 h-5 text-mentor-600 animate-spin" />
                </div>
              )}

              {shareError && (
                <p className="text-xs text-danger-700 font-medium">{shareError}</p>
              )}

              {shareUrl && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-surface-sunken p-2 rounded-xl border border-line">
                    <input
                      id="share-url-input"
                      type="text"
                      readOnly
                      value={shareUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="bg-transparent text-xs text-ink-soft font-mono w-full focus:outline-none px-1"
                    />
                    <Button
                      onClick={handleCopyLink}
                      tone={copied ? "success" : "mentor"}
                      size="sm"
                      icon={copied ? Check : Copy}
                      className="shrink-0"
                    >
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  {copyFailed && (
                    <p className="text-[11px] text-spark-700 font-medium">
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

/**
 * The mentoring loop as a row of steps.
 *
 * Nobody infers this flow from a stack of cards — the recipient has no account,
 * gets no score, and waits on a human reply, which is the opposite of what every
 * other learning app trains people to expect. So it is stated outright, and the
 * steps that are live for this mentor right now are the ones lit up.
 */
function FlowStrip({
  pendingCount,
  mentorableCount,
}: {
  pendingCount: number;
  mentorableCount: number;
}) {
  const steps = [
    {
      icon: CheckCircle2,
      label: "You finish",
      note: "a situation",
      on: mentorableCount > 0,
    },
    { icon: Share2, label: "You share", note: "a link", on: mentorableCount > 0 },
    { icon: PenLine, label: "They answer", note: "no account", on: pendingCount > 0 },
    { icon: MessageSquare, label: "You reply", note: "personally", on: pendingCount > 0 },
    { icon: Heart, label: "Tree grows", note: "one branch", on: pendingCount > 0 },
  ];

  return (
    <div className="bg-surface border border-line rounded-2xl p-4 shadow-card overflow-x-auto">
      <ol className="flex items-stretch gap-1.5 min-w-[520px]">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={s.label} className="flex items-center gap-1.5 flex-1">
              <div className="flex flex-col items-center text-center flex-1">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 ${
                    s.on
                      ? "bg-mentor-600 text-white"
                      : "bg-surface-sunken text-ink-faint border border-line"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span
                  className={`text-[11px] font-extrabold leading-tight ${
                    s.on ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {s.label}
                </span>
                <span className="text-[10px] text-ink-muted leading-tight">
                  {s.note}
                </span>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-line-strong shrink-0" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** What the recipient actually sent: their verdict, the prompts they picked,
 *  and anything they wrote themselves. */
function Submission({ review }: { review: PendingReview }) {
  const chips = review.reason_chips ?? [];
  return (
    <div className="bg-surface border border-line rounded-xl p-3.5 space-y-2">
      <p className="text-[11px] uppercase tracking-wide text-ink-muted font-extrabold">
        What they sent
      </p>
      <p className="text-sm text-ink-soft">
        <span className="font-extrabold capitalize text-ink">
          {review.learner_verdict ?? "—"}
        </span>
        {chips.length > 0 && (
          <span className="text-ink-muted">
            {" · "}
            {chips.map(chipLabel).join(" · ")}
          </span>
        )}
      </p>
      {review.learner_reasoning ? (
        <p className="text-sm text-ink-soft italic leading-relaxed whitespace-pre-wrap">
          &ldquo;{review.learner_reasoning}&rdquo;
        </p>
      ) : (
        <p className="text-sm text-ink-muted italic">
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

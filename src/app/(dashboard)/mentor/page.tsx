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
// The offline half of the Hub — logging a teaching session with photo/video
// proof, and the Knowledge Tree it grows — is unchanged apart from being able
// to attach the session to a module.
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMentorHub } from "@/hooks/useMentor";
import { supabase } from "@/lib/supabase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { chipLabel } from "@/types/mentor";
import type { MentorableModule } from "@/types/mentor";
import {
  Users,
  Share2,
  Loader2,
  Sparkles,
  UserPlus,
  Copy,
  Check,
  X,
  Upload,
  Camera,
  FileCheck,
  Zap,
  Link2,
  MessageSquare,
  Send,
  Lock,
} from "lucide-react";

export default function MentorHubPage() {
  const { user, loading: authLoading } = useAuth();
  const {
    mentorable,
    sessions,
    pending,
    loading,
    error,
    reload,
    createShareLink,
    replyToResponse,
  } = useMentorHub(user?.id);

  // Modals
  const [showProofModal, setShowProofModal] = useState(false);
  const [shareTarget, setShareTarget] = useState<MentorableModule | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Proof form
  const [learnerName, setLearnerName] = useState("");
  const [relationship, setRelationship] = useState("Mother / Father");
  const [moduleId, setModuleId] = useState<string>("");
  const [topicTaught, setTopicTaught] = useState("");
  const [notes, setNotes] = useState("");
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  // Reply composer, keyed by response id
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Default the logged topic to the chosen module's title, while leaving the
  // field editable — sessions logged before modules existed are free text, and
  // that stays true for anyone teaching something off-syllabus.
  useEffect(() => {
    if (!moduleId) return;
    const m = mentorable.find((x) => x.module_id === moduleId);
    if (m) setTopicTaught(m.title);
  }, [moduleId, mentorable]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleDemoQuickFill = () => {
    setLearnerName("Mom (Sunita)");
    setRelationship("Mother / Father");
    setNotes(
      "We sat together and went through a suspicious message asking her to tap a link. Checked the official app instead."
    );
    setProofPreview(
      "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80"
    );
    if (mentorable.length > 0) setModuleId(mentorable[0].module_id);
    else setTopicTaught("Spotting WhatsApp phishing links");
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!learnerName.trim() || !user) return;
    setSubmittingProof(true);
    try {
      const { error: insErr } = await supabase.from("mentoring_sessions").insert({
        mentor_id: user.id,
        learner_name: learnerName,
        relationship,
        topic_taught: topicTaught || null,
        module_id: moduleId || null,
        proof_file_url: proofPreview || "Verified offline session",
        notes,
      });
      if (insErr) throw new Error(insErr.message);
      await reload();
      setShowProofModal(false);
      setLearnerName("");
      setNotes("");
      setModuleId("");
      setTopicTaught("");
      setProofPreview(null);
    } catch (err: any) {
      console.error("Error saving proof:", err);
      setShareError(err?.message ?? "Could not save that session.");
    } finally {
      setSubmittingProof(false);
    }
  };

  const openShare = async (m: MentorableModule) => {
    setShareTarget(m);
    setShareError(null);
    setCopied(false);
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
  };

  const shareUrl =
    shareToken && typeof window !== "undefined"
      ? `${window.location.origin}/teach/${shareToken}`
      : "";

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReply = async (responseId: string) => {
    const draft = (replyDrafts[responseId] ?? "").trim();
    if (!draft) return;
    setReplyingTo(responseId);
    try {
      await replyToResponse(responseId, draft);
      setReplyDrafts((d) => ({ ...d, [responseId]: "" }));
    } catch (e: any) {
      setShareError(e?.message ?? "Could not send that reply.");
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

  const learnersCount = sessions.length;
  const reachCount = learnersCount + pending.length;

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Mentor Hub &amp; Ripple Tree
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Finish a module and you can mentor it right away — no need to
              complete all ten first.
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
        {pending.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-indigo-500 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                Pending Reviews
              </h2>
              <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                {pending.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              People you shared a link with have answered. They are waiting on
              you personally — there is no automatic answer key on their end.
            </p>

            <div className="space-y-3">
              {pending.map((p) => (
                <div
                  key={p.id}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50/60"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                      <Link2 className="w-3.5 h-3.5 text-emerald-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        Someone from your shared link
                      </p>
                      <p className="text-[11px] text-slate-500 italic truncate">
                        {p.module_title} · not a member yet
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 mb-1">
                    <span className="font-bold capitalize">
                      {p.learner_verdict ?? "—"}
                    </span>
                    {p.reason_chips?.length > 0 && (
                      <span className="text-slate-500">
                        {" · "}
                        {p.reason_chips.map(chipLabel).join(" · ")}
                      </span>
                    )}
                  </p>
                  {p.learner_reasoning && (
                    <p className="text-xs text-slate-600 italic mb-3">
                      &ldquo;{p.learner_reasoning}&rdquo;
                    </p>
                  )}

                  <textarea
                    rows={2}
                    value={replyDrafts[p.id] ?? ""}
                    onChange={(e) =>
                      setReplyDrafts((d) => ({ ...d, [p.id]: e.target.value }))
                    }
                    placeholder="Reply in your own words — what did they get right, and what did they miss?"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-2"
                  />
                  <button
                    onClick={() => handleReply(p.id)}
                    disabled={
                      replyingTo === p.id || !(replyDrafts[p.id] ?? "").trim()
                    }
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {replyingTo === p.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Send reply
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

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

        {/* ---- Tree + Nutrition Facts ------------------------------------ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between min-h-[420px]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-900" />
                <h2 className="text-base font-black text-slate-900">
                  Your Knowledge Tree
                </h2>
              </div>
              <button
                onClick={() => setShowProofModal(true)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Log Teaching Proof</span>
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center py-8">
              {learnersCount === 0 ? (
                <div className="text-center max-w-sm space-y-3 px-4">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-slate-900">
                    Your Tree is Waiting for Its First Seed
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Taught someone in person? Click{" "}
                    <strong className="text-slate-800">
                      &quot;Log Teaching Proof&quot;
                    </strong>{" "}
                    to record it and watch their branch grow.
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {sessions.map((node) => (
                      <div
                        key={node.id}
                        className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-start gap-3 shadow-sm animate-in fade-in zoom-in duration-300"
                      >
                        {node.proof_file_url &&
                        node.proof_file_url.startsWith("http") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={node.proof_file_url}
                            alt="Proof"
                            className="w-12 h-12 rounded-lg object-cover border border-emerald-300 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-sm">
                            {node.learner_name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {node.learner_name}
                            </h4>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">
                              Verified
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {node.relationship}
                          </p>
                          {node.topic_taught && (
                            <p className="text-[11px] text-emerald-900 font-medium truncate mt-1">
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
                {learnersCount > 0
                  ? `Your Ripple Tree has reached ${learnersCount} secondary learners.`
                  : "Log an in-person session, or share a module link above."}
              </span>
            </div>
          </div>

          {/* Nutrition Facts */}
          <div className="bg-white rounded-2xl border-2 border-slate-900 p-6 shadow-sm space-y-4 self-start">
            <div className="border-b-4 border-slate-900 pb-2">
              <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">
                NUTRITION FACTS
              </h2>
              <p className="text-xs font-bold text-slate-700">
                Your Community Impact Diet
              </p>
            </div>

            <div className="space-y-3 text-xs font-bold text-slate-900 divide-y divide-slate-200">
              <div className="flex justify-between pt-1">
                <span>Modules You Can Mentor</span>
                <span className="text-emerald-700">
                  {mentorable.length} of 10
                </span>
              </div>

              <div className="flex justify-between pt-2">
                <span>Verified Mentoring Proofs</span>
                <span className="text-emerald-700">{learnersCount} Logged</span>
              </div>

              <div className="flex justify-between pt-2">
                <span>Replies Owed</span>
                <span
                  className={
                    pending.length > 0 ? "text-amber-700" : "text-emerald-700"
                  }
                >
                  {pending.length}
                </span>
              </div>

              <div className="flex justify-between pt-2">
                <span>Ripple Tree Reach</span>
                <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px]">
                  {reachCount === 0
                    ? "SEED"
                    : reachCount > 2
                    ? "FOREST"
                    : "BRANCHING"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Log Teaching Proof modal ---------------------------------- */}
        {showProofModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-base font-black">
                      Verify Teaching Session
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Record an in-person session you ran.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProofModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={handleSubmitProof}
                className="p-6 space-y-4 overflow-y-auto flex-1"
              >
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>Hackathon Presenter Mode:</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDemoQuickFill}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Quick-Fill Sample Proof
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Learner&apos;s Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={learnerName}
                      onChange={(e) => setLearnerName(e.target.value)}
                      placeholder="e.g., Mom (Sunita), Alex"
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Relationship
                    </label>
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    >
                      <option>Mother / Father</option>
                      <option>Grandparent</option>
                      <option>Sibling / Cousin</option>
                      <option>Classmate / Friend</option>
                      <option>Community Member</option>
                    </select>
                  </div>
                </div>

                {/* Optional module link. Free text stays available so a session
                    about something off-syllabus is still loggable. */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Which module? (optional)
                  </label>
                  <select
                    value={moduleId}
                    onChange={(e) => setModuleId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="">Not tied to a module</option>
                    {mentorable.map((m) => (
                      <option key={m.module_id} value={m.module_id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    What Topic Did You Teach Them? *
                  </label>
                  <input
                    type="text"
                    required
                    value={topicTaught}
                    onChange={(e) => setTopicTaught(e.target.value)}
                    placeholder="e.g., Spotting WhatsApp Forwarded Phishing Links"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Photo / Video Proof (Session Snapshot)
                  </label>
                  <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-4 text-center cursor-pointer transition-colors relative bg-slate-50/50">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {proofPreview ? (
                      <div className="space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proofPreview}
                          alt="Proof Preview"
                          className="max-h-36 mx-auto rounded-lg object-cover border border-slate-300 shadow-sm"
                        />
                        <p className="text-[11px] text-emerald-700 font-bold">
                          ✓ Media attached • Click to replace
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 py-2">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-200">
                          <Upload className="w-5 h-5 text-slate-600" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">
                          Click to upload Photo or Video
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Held in the browser for now — not uploaded anywhere.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Brief Session Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What did you check together?"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingProof || !learnerName.trim()}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submittingProof ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Verify &amp; Grow Knowledge Tree</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

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
                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
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
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

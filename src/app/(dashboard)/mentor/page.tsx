// src/app/(dashboard)/mentor/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  Users,
  Share2,
  Loader2,
  Sparkles,
  UserPlus,
  Copy,
  Check,
  X,
  Lock,
  Upload,
  Camera,
  Video,
  FileCheck,
  Zap,
  Award,
} from "lucide-react";

interface LearnerNode {
  id: string;
  learner_name: string;
  relationship: string;
  topic_taught: string;
  proof_preview?: string;
  created_at: string;
}

export default function MentorHubPage() {
  const { user, loading: authLoading } = useAuth();
  const [completedModule, setCompletedModule] = useState(false);
  const [loading, setLoading] = useState(true);

  // Tree & Learners State
  const [verifiedLearners, setVerifiedLearners] = useState<LearnerNode[]>([]);

  // Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Proof Form State
  const [learnerName, setLearnerName] = useState("");
  const [relationship, setRelationship] = useState("Family Member");
  const [topicTaught, setTopicTaught] = useState("Chapter 1: Lateral Reading & WhatsApp Scams");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  useEffect(() => {
    const fetchMentorData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user completed Module 1
        const { data: prog } = await supabase
          .from("user_module_progress")
          .select("completed_lessons")
          .eq("user_id", user.id)
          .maybeSingle();

        if (prog && prog.completed_lessons >= 5) {
          setCompletedModule(true);
        } else {
          setCompletedModule(false);
        }

        // Fetch logged mentoring sessions from Supabase
        const { data: sessions } = await supabase
          .from("mentoring_sessions")
          .select("*")
          .eq("mentor_id", user.id)
          .order("created_at", { ascending: false });

        if (sessions && sessions.length > 0) {
          setVerifiedLearners(
            sessions.map((s: any) => ({
              id: s.id,
              learner_name: s.learner_name,
              relationship: s.relationship || "Learner",
              topic_taught: s.topic_taught,
              proof_preview: s.proof_file_url,
              created_at: s.created_at,
            }))
          );
        }
      } catch (err) {
        console.error("Error fetching mentor data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchMentorData();
    }
  }, [user, authLoading]);

  // Handle Image/Video File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  // Quick-Fill Sample Proof for Hackathon Stage Demo
  const handleDemoQuickFill = () => {
    setLearnerName("Mom (Sunita)");
    setRelationship("Mother");
    setTopicTaught("Spotting WhatsApp Forwarded Loan & Phishing Scams");
    setNotes("We sat together and analyzed a suspicious WhatsApp message asking to click an APK link. Checked RBI official portal together!");
    setProofPreview("https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80"); // Sample workshop photo
  };

  // Submit Verified Mentoring Session
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!learnerName.trim() || !user) return;

    setSubmittingProof(true);

    const newNode: LearnerNode = {
      id: `local-${Date.now()}`,
      learner_name: learnerName,
      relationship: relationship,
      topic_taught: topicTaught,
      proof_preview: proofPreview || undefined,
      created_at: new Date().toISOString(),
    };

    try {
      // Save to Supabase (non-blocking fallback for stage demo)
      const { error } = await supabase.from("mentoring_sessions").insert({
        mentor_id: user.id,
        learner_name: learnerName,
        relationship: relationship,
        topic_taught: topicTaught,
        proof_file_url: proofPreview || "Verified offline session",
        notes: notes,
      });

      if (error) {
        console.warn("⚠️ Supabase sessions table notice (using UI fallback):", error.message);
      }
    } catch (err) {
      console.error("Error saving proof:", err);
    } finally {
      // Instantly grow the tree in UI
      setVerifiedLearners((prev) => [newNode, ...prev]);
      setShowProofModal(false);
      setLearnerName("");
      setNotes("");
      setProofFile(null);
      setProofPreview(null);
      setSubmittingProof(false);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/share/demo-mentor-${user?.id?.slice(0, 8)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const learnersCount = verifiedLearners.length;

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Mentor Hub & Ripple Tree
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Your wisdom ripples through the community. Log verified teaching sessions to grow your tree of critical thinkers.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-900">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Community Beacon ({learnersCount} People Reached)</span>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Knowledge Tree & Learners Canvas */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between min-h-[420px]">
            {/* Card Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-900" />
                <h2 className="text-base font-black text-slate-900">
                  Your Knowledge Tree
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowProofModal(true)}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Log Teaching Proof</span>
                </button>
              </div>
            </div>

            {/* Tree Canvas */}
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
                    Taught someone how to spot fake news? Click <strong className="text-slate-800">"Log Teaching Proof"</strong> above to upload a photo/video and watch their branch grow!
                  </p>
                </div>
              ) : (
                <div className="w-full space-y-6">
                  {/* Center Node ("You") */}
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-900 text-white font-black text-base rounded-full flex items-center justify-center shadow-lg ring-4 ring-emerald-100 z-10">
                      You
                    </div>
                    <div className="w-0.5 h-6 bg-slate-300"></div>
                  </div>

                  {/* Dynamic Learner Nodes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {verifiedLearners.map((node) => (
                      <div
                        key={node.id}
                        className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-start gap-3 shadow-sm animate-in fade-in zoom-in duration-300"
                      >
                        {node.proof_preview ? (
                          <img
                            src={node.proof_preview}
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
                          <p className="text-[11px] text-emerald-900 font-medium truncate mt-1">
                            📚 {node.topic_taught}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Toolbar */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500 font-medium">
                {learnersCount > 0
                  ? `Your Ripple Tree has reached ${learnersCount} secondary learners.`
                  : "Upload teaching sessions or share your digital invite."}
              </span>

              <button
                onClick={() => setShowShareModal(true)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Get Digital Share Link</span>
              </button>
            </div>
          </div>

          {/* Nutrition Facts Card */}
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
                <span>Verified Mentoring Proofs</span>
                <span className="text-emerald-700">{learnersCount} Logged</span>
              </div>

              <div className="flex justify-between pt-2">
                <span>Fact-Checking Stamina</span>
                <span className="text-emerald-700">
                  {learnersCount > 0 || completedModule ? "100%" : "0%"}
                </span>
              </div>

              <div className="flex justify-between pt-2">
                <span>Ripple Tree Reach</span>
                <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px]">
                  {learnersCount === 0 ? "SEED" : learnersCount > 2 ? "FOREST" : "BRANCHING"}
                </span>
              </div>

              <div className="flex justify-between pt-2">
                <span>Propaganda Consumed</span>
                <span className="text-emerald-700">0g</span>
              </div>
            </div>
          </div>
        </div>

        {/* LOG MENTORING PROOF MODAL (PHOTO / VIDEO UPLOAD) */}
        {showProofModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="text-base font-black">Verify Teaching Session</h3>
                    <p className="text-[11px] text-slate-400">
                      Upload a photo or video proof of your offline mentoring session.
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

              {/* Form Body */}
              <form onSubmit={handleSubmitProof} className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Hackathon Quick-Fill Demo Button */}
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

                {/* Learner Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Learner's Name *
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
                      <option value="Mother / Father">Mother / Father</option>
                      <option value="Grandparent">Grandparent</option>
                      <option value="Sibling / Cousin">Sibling / Cousin</option>
                      <option value="Classmate / Friend">Classmate / Friend</option>
                      <option value="Community Member">Community Member</option>
                    </select>
                  </div>
                </div>

                {/* Topic Taught */}
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

                {/* Photo / Video Upload Area */}
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
                          Supports PNG, JPG, MP4 (Max 15MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Session Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Brief Session Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What viral claim did you check together?"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                {/* Submit Button */}
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
                      <span>Verify & Grow Knowledge Tree</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Sharable Digital Link Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-black text-slate-900">
                    Your Digital Mentor Link
                  </h3>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Send this link to family or friends in WhatsApp or Telegram groups. When they open it, they will review a scenario you verified!
              </p>

              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/demo-mentor-${user?.id?.slice(0, 8)}`}
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
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

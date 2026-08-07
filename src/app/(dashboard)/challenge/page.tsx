// src/app/(dashboard)/challenge/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
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
  ExternalLink,
} from "lucide-react";

interface RichScenario {
  id: string;
  title: string;
  body_context: string;
  category: "source_checking" | "deepfake" | "phishing" | "emotional_manipulation";
  verdict: "real" | "fake";
  original_publisher: string;
  mediaType?: "text" | "image" | "audio" | "video";
  mediaUrl?: string;
  sourceChannel?: string;
  viralReach?: string;
  dateStr?: string;
}

interface FeedbackResult {
  score: number;
  verdictTitle: string;
  personalizedFeedback: string;
  sourceAudit: string;
  keyLesson?: string;
}

export default function ChallengePage() {
  const [scenario, setScenario] = useState<RichScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [assessment, setAssessment] = useState<"fake" | "real" | "evidence" | "">("");
  const [userReasoning, setUserReasoning] = useState("");
  const [noSourceFound, setNoSourceFound] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");

  // Result State
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch Live Internet / Curated Scenario
  const fetchScenario = async () => {
    setLoading(true);
    setFeedback(null);
    setAssessment("");
    setUserReasoning("");
    setNoSourceFound(false);
    setSourceUrl("");
    setError(null);

    try {
      const res = await fetch("/api/scenarios/live", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch scenario");
      const data: RichScenario = await res.json();
      setScenario(data);
    } catch (err) {
      console.error("Error loading scenario:", err);
      // Hardcoded graceful client fallback
      setScenario({
        id: "mm-whatsapp-laptop",
        title: "FREE LAPTOP SCHEME: Ministry of Education Student Registration Portal",
        body_context:
          "URGENT FORWARD: All university students are eligible for a free laptop under the 2026 Digital India Initiative. Register on this portal link before 11:59 PM today and forward this message to 5 WhatsApp groups to activate eligibility.",
        category: "phishing",
        verdict: "fake",
        original_publisher: "WhatsApp Broadcast Forward",
        mediaType: "image",
        sourceChannel: "WhatsApp Forward",
        viralReach: "Forwarded many times",
        dateStr: "August 2026",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenario();
  }, []);

  // Submit Reasoning to Backend AI Coach
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenario || !assessment || userReasoning.trim().length < 15) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demo-user-123",
          scenarioId: scenario.id,
          assessment,
          userReasoning,
          noSourceFound,
          sourceUrl: noSourceFound
            ? `Checked official domain: ${sourceUrl || "No official source found"}`
            : sourceUrl,
          scenarioContext: {
            title: scenario.title,
            verdict: scenario.verdict,
            category: scenario.category,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Evaluation failed");
      setFeedback(data);
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err.message || "Failed to evaluate response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Daily MIL Challenge <span className="text-emerald-600">—</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Analyze live internet claims, cite your sources, and get AI Coach feedback.
          </p>
        </div>
        <button
          onClick={fetchScenario}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Load New Claim
        </button>
      </div>

      {/* Main Scenario Loading / Card View */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">
            Scraping live internet claims & verification networks...
          </p>
        </div>
      ) : scenario ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Sleek Article / Channel Header */}
          <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
                <Globe className="w-3 h-3 text-emerald-400" />
                {scenario.sourceChannel || "Internet Claim"}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">{scenario.original_publisher}</span>
            </div>

            {scenario.viralReach && (
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-800/30">
                <Share2 className="w-3 h-3" />
                <span>{scenario.viralReach}</span>
              </div>
            )}
          </div>

          {/* Special Visual Banner 1: Green WhatsApp "Forwarded Many Times" Badge */}
          {scenario.sourceChannel === "WhatsApp Forward" && (
            <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-2.5 flex items-center justify-between text-xs text-emerald-900 font-medium">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center bg-emerald-600 text-white rounded-full p-1">
                  <Share2 className="w-3 h-3" />
                </span>
                <span className="font-bold text-emerald-800">Forwarded many times</span>
              </div>
              <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
                WhatsApp Forward Warning
              </span>
            </div>
          )}

          {/* REAL PLAYABLE AUDIO PLAYER (For Audio Deepfakes or Official Briefings) */}
          {scenario.mediaType === "audio" && scenario.mediaUrl && (
            <div className="bg-slate-900 text-white p-5 border-b border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                  <Volume2 className="w-4 h-4 text-indigo-400" />
                  <span>Audio Evidence — Click Play to Listen</span>
                </div>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                  Audio Claim
                </span>
              </div>

              {/* REAL HTML5 AUDIO ELEMENT */}
              <audio
                controls
                className="w-full h-11 rounded-lg bg-slate-800 accent-emerald-500"
                src={scenario.mediaUrl}
              >
                Your browser does not support the audio element.
              </audio>
              <p className="text-[11px] text-slate-400 italic">
                Listen carefully: Does the audio sound synthetic, robotic, or lack official verification?
              </p>
            </div>
          )}

          {/* REAL VIEWABLE IMAGE EVIDENCE (For Photo Claims / Weather Alerts) */}
          {scenario.mediaType === "image" && scenario.mediaUrl && (
            <div className="bg-slate-100 border-b border-slate-200 p-4 flex flex-col items-center justify-center space-y-2">
              <img
                src={scenario.mediaUrl}
                alt={scenario.title}
                className="max-h-80 w-full object-cover rounded-xl border border-slate-300 shadow-sm"
              />
              <span className="text-[11px] text-slate-500 font-medium">
                Visual Evidence • Inspect landmarks, flood levels, and original context
              </span>
            </div>
          )}

          {/* Scenario Content Body */}
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-black text-slate-900 leading-snug">
              {scenario.title}
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
              {scenario.body_context}
            </p>
          </div>
        </div>
      ) : null}

      {/* Assessment Form */}
      {scenario && !feedback && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          {/* Section 1: Initial Assessment */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-900">
              1. What is your initial assessment of this claim?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAssessment("fake")}
                className={`p-3.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all ${
                  assessment === "fake"
                    ? "bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20 shadow-sm"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Likely Fake / Scam</span>
              </button>

              <button
                type="button"
                onClick={() => setAssessment("real")}
                className={`p-3.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all ${
                  assessment === "real"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20 shadow-sm"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Likely Real / Verified</span>
              </button>

              <button
                type="button"
                onClick={() => setAssessment("evidence")}
                className={`p-3.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all ${
                  assessment === "evidence"
                    ? "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20 shadow-sm"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <HelpCircle className="w-5 h-5 text-amber-600" />
                <span>Needs More Evidence</span>
              </button>
            </div>
          </div>

          {/* Section 2: Typed Reasoning */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-900">
              2. Explain your reasoning in your own words (Required):
            </label>
            <p className="text-xs text-slate-500">
              Mention specific red flags (e.g., artificial urgency, missing domain names, chain forwarding demands). Minimum 15 characters.
            </p>
            <textarea
              rows={4}
              value={userReasoning}
              onChange={(e) => setUserReasoning(e.target.value)}
              placeholder="Explain why you think this is true or false..."
              className="w-full p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none text-sm text-slate-900"
            />
          </div>

          {/* Section 3: Verification Source & "No Source Found" Toggle */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            {/* Checkbox for Absence of Evidence */}
            <div className="flex items-start space-x-3 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/60">
              <input
                type="checkbox"
                id="noSourceFound"
                checked={noSourceFound}
                onChange={(e) => {
                  setNoSourceFound(e.target.checked);
                  if (e.target.checked) setSourceUrl("");
                }}
                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-amber-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label
                htmlFor="noSourceFound"
                className="text-xs font-medium text-amber-900 cursor-pointer leading-snug"
              >
                I searched official channels, but{" "}
                <span className="font-bold underline text-amber-950">
                  NO official announcement or source exists
                </span>{" "}
                for this claim.
              </label>
            </div>

            {/* Input URL or Official Portal Checked */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {noSourceFound
                  ? "Which official portal/website did you check? (e.g., education.gov.in or pib.gov.in):"
                  : "Verification Source URL (Where did you check this?):"}
              </label>
              <input
                type="text"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder={
                  noSourceFound
                    ? "e.g., Checked Ministry of Education official portal (education.gov.in)"
                    : "https://www.reuters.com/fact-check/... or official domain"
                }
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none text-sm text-slate-900"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              submitting || !assessment || userReasoning.trim().length < 15
            }
            className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>AI Coach Auditing Reasoning & Sources...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Submit Reasoning for AI Evaluation</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* AI Evaluation Result Card */}
      {feedback && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-6 animate-in fade-in duration-300">
          {/* Header Score Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {feedback.verdictTitle}
                </h3>
                <p className="text-xs text-slate-500">AI Coach Assessment Complete</p>
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

          {/* Personalized Reasoning Feedback */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              Coach Feedback on Your Reasoning
            </h4>
            <p className="text-sm text-slate-800 italic leading-relaxed">
              "{feedback.personalizedFeedback}"
            </p>
          </div>

          {/* Source Credibility Audit */}
          <div className="space-y-2 bg-indigo-50/60 p-4 rounded-xl border border-indigo-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-indigo-600" />
              Source Credibility Audit
            </h4>
            <p className="text-sm text-indigo-950 leading-relaxed font-medium">
              {feedback.sourceAudit}
            </p>
          </div>

          {/* Action Button: Next Challenge */}
          <button
            onClick={fetchScenario}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Another Challenge</span>
          </button>
        </div>
      )}
    </div>
  );
}

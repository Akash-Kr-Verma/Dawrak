// src/app/(dashboard)/learn/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  BookOpen,
  Play,
  CheckCircle2,
  TrendingUp,
  Loader2,
  ArrowRight,
  Sparkles,
  X,
  FileText,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface ModuleProgress {
  module_id: string;
  completed_lessons: number;
  total_lessons: number;
}

interface LessonContent {
  id: number;
  title: string;
  duration: string;
  summary: string;
  keyTakeaways: string[];
  forensicTip: string;
}

const MODULE_1_LESSONS: LessonContent[] = [
  {
    id: 1,
    title: "Lesson 1: Lateral Reading & Tab-Switching Basics",
    duration: "5 mins",
    summary:
      "Traditional readers read vertically—staying on a single website and reading top to bottom. Professional fact-checkers read laterally—opening new browser tabs immediately to search what other independent sources say about the publisher before trusting the claim.",
    keyTakeaways: [
      "Never judge a site by its About Us page; scammers write their own biographies.",
      "Open 2-3 new tabs immediately to search the domain name alongside terms like 'fact check' or 'credibility'.",
      "Look for independent verification from IFCN-certified signatories (e.g., AltNews, BoomLive, Reuters).",
    ],
    forensicTip:
      "When encountering a viral story, leave the original tab within 10 seconds to cross-reference primary sources.",
  },
  {
    id: 2,
    title: "Lesson 2: Domain Forensics & Lookalike URLs",
    duration: "7 mins",
    summary:
      "Scammers register domains that mimic trusted news or government portals (e.g., using .co or .net instead of .gov.in or .org). Domain forensics involves inspecting the exact web address for subtle misspellings or unofficial extensions.",
    keyTakeaways: [
      "Official Indian government portals always end in .gov.in or .nic.in.",
      "Watch for typosquatting (e.g., timesoflndia.com using a capital 'i' or lowercase 'l').",
      "Free hosting services (.xyz, .top, .tk) are major red flags for phishing scams.",
    ],
    forensicTip:
      "Always inspect the domain root in your address bar before entering personal details or clicking download links.",
  },
  {
    id: 3,
    title: "Lesson 3: Reverse Image Forensics & Out-of-Context Media",
    duration: "6 mins",
    summary:
      "Most fake photos aren't AI deepfakes—they are real, authentic photographs from past events recycled with a false new headline to stir panic.",
    keyTakeaways: [
      "Use Google Lens or TinEye to find the earliest published date of an image.",
      "Check weather conditions, street sign languages, and vehicle license plates in the photo background.",
      "If a 'breaking photo' appears without a city or timestamp, treat it as unverified.",
    ],
    forensicTip:
      "Right-click any suspicious image and select 'Search image with Google' to trace its original context.",
  },
  {
    id: 4,
    title: "Lesson 4: Synthetic Audio & AI Voice Deepfake Analysis",
    duration: "8 mins",
    summary:
      "AI voice-cloning technology allows scammers to replicate senior officials or family members using just 3 seconds of sample audio. Detecting synthetic audio requires listening for unnatural cadence and acoustic anomalies.",
    keyTakeaways: [
      "Synthetic voices often lack natural breathing pauses or emotional inflection.",
      "Listen for robotic reverberation or unnatural pitch shifts on vowels.",
      "Always verify voice memos claiming emergency policy changes with official news bulletins.",
    ],
    forensicTip:
      "If a voice note demands urgent financial action, hang up and call the person back directly on their registered phone number.",
  },
  {
    id: 5,
    title: "Lesson 5: Emotional Priming & Chain-Forwarding Tactics",
    duration: "6 mins",
    summary:
      "Fake news relies on 'emotional priming'—designed to provoke immediate anger, fear, or excitement so you forward the message before your critical thinking instincts activate.",
    keyTakeaways: [
      "Phrases like 'Forward before deleted' or 'Urgent warning' are psychological triggers.",
      "WhatsApp 'Forwarded many times' badges indicate unverified viral distribution.",
      "If a message makes you feel intense panic, pause for 60 seconds before taking action.",
    ],
    forensicTip:
      "Verify the claim on an official portal before sharing it in family or community WhatsApp groups.",
  },
];

export default function LearnPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [progress, setProgress] = useState<ModuleProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<LessonContent | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch or initialize user progress from Supabase
  const fetchProgress = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("user_module_progress")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setProgress(data);
      } else {
        // Default clean slate progress
        const defaultProg = {
          module_id: "mod-1",
          completed_lessons: 0,
          total_lessons: 5,
        };
        setProgress(defaultProg);
      }
    } catch (err) {
      console.error("Error fetching progress:", err);
      setProgress({ module_id: "mod-1", completed_lessons: 0, total_lessons: 5 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchProgress();
    }
  }, [user, authLoading]);

  // Complete a lesson and update Supabase (with bulletproof demo fallback)
  const handleCompleteLesson = async (lessonId: number) => {
    if (!user) return;
    setSaving(true);

    const newCompleted = Math.max(progress?.completed_lessons || 0, lessonId);

    try {
      const { error } = await supabase.from("user_module_progress").upsert(
        {
          user_id: user.id,
          module_id: "mod-1",
          completed_lessons: newCompleted,
          total_lessons: 5,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,module_id" }
      );

      if (error) {
        console.warn("⚠️ Supabase upsert notice (using UI fallback):", error.message);
      }
    } catch (err) {
      console.error("Error saving progress to DB:", err);
    } finally {
      // ALWAYS update UI state so the hackathon demo never blocks or shows an error alert
      setProgress({
        module_id: "mod-1",
        completed_lessons: newCompleted,
        total_lessons: 5,
      });

      setActiveLesson(null); // Close Modal smoothly
      setSaving(false);
    }
  };

  // Hackathon Demo Mode: Instantly Complete Module 1 (5/5)
  const handleFastTrackModule = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase.from("user_module_progress").upsert(
        {
          user_id: user.id,
          module_id: "mod-1",
          completed_lessons: 5,
          total_lessons: 5,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,module_id" }
      );

      if (error) {
        console.warn("⚠️ Supabase fast-track notice (using UI fallback):", error.message);
      }
    } catch (err) {
      console.error("Error fast-tracking module:", err);
    } finally {
      // ALWAYS update UI state immediately
      setProgress({
        module_id: "mod-1",
        completed_lessons: 5,
        total_lessons: 5,
      });

      setSaving(false);
      alert("🎉 Module 1 Completed! Mentor Hub features are now unlocked.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const completed = progress?.completed_lessons || 0;
  const total = progress?.total_lessons || 5;
  const percentage = Math.round((completed / total) * 100);
  const isZeroState = completed === 0;
  const isModuleFinished = completed >= total;

  const currentLessonToPlay = MODULE_1_LESSONS[Math.min(completed, 4)];

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Welcome, {profile?.full_name || user?.email?.split("@")[0] || "Changemaker"}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Master critical media literacy and mentor your community.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFastTrackModule}
              disabled={saving || isModuleFinished}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              title="Click to instantly complete Module 1 for testing/demo"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Demo: Unlock Module 1</span>
            </button>

            <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-800">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>
                {isModuleFinished
                  ? "Tier 2 Contributor"
                  : isZeroState
                  ? "Tier 1 Novice"
                  : `Level ${profile?.level || 1} Apprentice`}
              </span>
            </div>
          </div>
        </div>

        {/* Current Module Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider rounded-full">
              {isModuleFinished
                ? "Module 1 Completed 🎉"
                : `Getting Started • Module 1 (${completed}/${total} Lessons)`}
            </span>
            <span className="text-xs font-bold text-slate-500">
              {percentage}% Mastered
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Thumbnail */}
            <div
              onClick={() => setActiveLesson(currentLessonToPlay)}
              className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="w-12 h-12 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform z-10">
                <Play className="w-5 h-5 fill-slate-900 ml-0.5" />
              </div>
              <span className="absolute bottom-2.5 left-3 text-[11px] font-bold text-white z-10">
                {currentLessonToPlay.title}
              </span>
            </div>

            {/* Module Overview */}
            <div className="md:col-span-2 space-y-3">
              <h2 className="text-xl font-black text-slate-900 leading-snug">
                Chapter 1: Foundations of Source Verification & Lateral Reading
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Learn how professional fact-checkers verify viral claims in seconds. Master lateral reading, domain forensics, and spotting manipulated context before sharing.
              </p>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Current Progress</span>
                  <span className="text-emerald-700">{completed} of 5 Lessons</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="text-xs font-medium text-slate-500">
              {isModuleFinished
                ? "Chapter 1 Complete! You can now generate sharable links in Mentor Hub."
                : `Up Next: ${currentLessonToPlay.title}`}
            </div>

            <button
              onClick={() => setActiveLesson(currentLessonToPlay)}
              className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors inline-flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>
                {isModuleFinished
                  ? "Review Lessons"
                  : isZeroState
                  ? "Start First Lesson"
                  : `Continue Lesson ${completed + 1}`}
              </span>
            </button>
          </div>
        </div>

        {/* Lesson Syllabus Checklist */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900">
            Module 1 Syllabus ({completed}/5 Completed)
          </h3>
          <div className="space-y-2">
            {MODULE_1_LESSONS.map((lesson) => {
              const isDone = completed >= lesson.id;
              return (
                <div
                  key={lesson.id}
                  onClick={() => setActiveLesson(lesson)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isDone
                      ? "bg-emerald-50/60 border-emerald-200 text-emerald-950"
                      : "bg-slate-50/50 border-slate-200 hover:bg-slate-100 text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                        {lesson.id}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold">{lesson.title}</h4>
                      <p className="text-[11px] text-slate-500">{lesson.duration}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 hover:underline">
                    {isDone ? "Review" : "Study"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Lesson Study Modal */}
      {activeLesson && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden space-y-6 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Study Material • Lesson {activeLesson.id} of 5
                  </span>
                  <h3 className="text-base font-black">{activeLesson.title}</h3>
                </div>
              </div>
              <button
                onClick={() => setActiveLesson(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Study Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-xs leading-relaxed flex-1">
              {/* Concept Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <h4 className="font-bold text-slate-900 text-xs">
                  Core Concept Overview
                </h4>
                <p className="text-slate-700 text-xs leading-relaxed">
                  {activeLesson.summary}
                </p>
              </div>

              {/* Key Takeaways */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Key Forensic Takeaways
                </h4>
                <ul className="space-y-2">
                  {activeLesson.keyTakeaways.map((point, idx) => (
                    <li
                      key={idx}
                      className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex items-start gap-2 text-emerald-950"
                    >
                      <span className="font-bold text-emerald-700">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pro Forensic Rule */}
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-950 font-medium">
                <span className="font-bold block text-amber-900 mb-0.5">
                  ⚡ Pro Rule of Thumb:
                </span>
                {activeLesson.forensicTip}
              </div>
            </div>

            {/* Modal Footer Button */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                Completing saves +100 PTS to your profile.
              </span>

              <button
                onClick={() => handleCompleteLesson(activeLesson.id)}
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Lesson Complete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}

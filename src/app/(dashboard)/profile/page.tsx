// src/app/(dashboard)/profile/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  LogOut,
  Award,
  TrendingUp,
  Loader2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";

// Semi-circular progress arc SVG component
function ProgressArc({ value, color, size = 80 }: { value: number; color: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = Math.PI * radius;
  const dashOffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size / 2 + 8 }}>
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
        {/* Background arc */}
        <path
          d={`M 4 ${size / 2 + 4} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2 + 4}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          className="text-white/40"
        />
        {/* Progress arc */}
        <path
          d={`M 4 ${size / 2 + 4} A ${radius} ${radius} 0 0 1 ${size - 4} ${size / 2 + 4}`}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <span className="absolute bottom-0 text-sm font-black" style={{ color }}>{value}%</span>
    </div>
  );
}

interface AttemptStat {
  ai_score: number;
  scenario_category?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, logout } = useAuth();
  const [attempts, setAttempts] = useState<AttemptStat[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Fetch real user attempts from PostgreSQL
  useEffect(() => {
    const fetchAttempts = async () => {
      if (!user) {
        setLoadingStats(false);
        return;
      }
      try {
        const { data } = await supabase
          .from("attempts")
          .select("ai_score, scenarios(category)")
          .eq("user_id", user.id);
        if (data && data.length > 0) {
          const formatted = data.map((item: any) => ({
            ai_score: item.ai_score || 0,
            scenario_category: item.scenarios?.category || "source_checking",
          }));
          setAttempts(formatted);
        } else {
          setAttempts([]); // true zero state
        }
      } catch (err) {
        console.error("Error loading attempts:", err);
      } finally {
        setLoadingStats(false);
      }
    };
    if (!authLoading) fetchAttempts();
  }, [user, authLoading]);

  const calculateCompetency = (category: string) => {
    const filtered = attempts.filter(
      (a) => a.scenario_category === category && a.ai_score > 0
    );
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, cur) => acc + cur.ai_score, 0);
    return Math.round(sum / filtered.length);
  };

  const sourceCheckingScore = calculateCompetency("source_checking");
  const deepfakeScore = calculateCompetency("deepfake");
  const phishingScore = calculateCompetency("phishing");

  const avgLogicScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((acc, cur) => acc + cur.ai_score, 0) / attempts.length
        )
      : 0;

  const dynamicLevel = Math.floor(attempts.length / 3) + 1;
  const dynamicPoints = attempts.reduce((acc, cur) => acc + cur.ai_score, 0);

  if (authLoading || loadingStats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        {/* Profile Header — Gradient Card */}
        <div className="bg-gradient-to-r from-[#7C3AED] to-[#FDA4AF] rounded-3xl p-6 shadow-xl shadow-indigo-500/10 text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white text-[#7C3AED] font-black text-2xl flex items-center justify-center shadow-lg ring-4 ring-white/30">
                {profile?.full_name?.charAt(0).toUpperCase() ||
                  user?.email?.charAt(0).toUpperCase() ||
                  "C"}
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">
                  {profile?.full_name || user?.email?.split("@")[0] || "New Changemaker"}
                </h1>
                <p className="text-xs text-white/70 font-medium">{profile?.email || user?.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-[#A3E635] text-slate-900">
                    <CheckCircle2 className="w-3 h-3" /> Level {dynamicLevel}{" "}
                    {dynamicLevel === 1 ? "Novice" : "Sentinel"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2">
                <span className="block text-[10px] text-white/60 uppercase tracking-wider font-bold">Total Points</span>
                <span className="text-xl font-black">{dynamicPoints} PTS</span>
              </div>
              <button
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
                className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-2xl transition-colors"
                title="Log Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {attempts.length === 0 && (
          <div className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white rounded-3xl p-6 shadow-lg shadow-indigo-500/15 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A3E635] uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Zero Progress — Clean Slate</span>
              </div>
              <h3 className="text-lg font-black">You haven&apos;t attempted any MIL Challenges yet!</h3>
              <p className="text-xs text-indigo-200">Complete your first reasoning evaluation to unlock analytics and start earning Level Badges.</p>
            </div>
            <button
              onClick={() => router.push("/challenge")}
              className="px-5 py-3 bg-[#A3E635] hover:bg-[#84CC16] text-slate-900 font-black rounded-full text-xs inline-flex items-center gap-2 shadow-lg shadow-lime-500/20 btn-bouncy"
            >
              <span>Start First Challenge</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Analytics — Stacked Colorful Cards with Arcs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-[#1E1B4B] tracking-tight">Media Literacy Skill Analytics</h2>
              <p className="text-xs text-slate-500">Calculated dynamically from your evaluation history.</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full text-xs font-bold text-[#7C3AED] shadow-sm">
              <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
              <span>{avgLogicScore}% Avg</span>
            </div>
          </div>

          {/* Stacked overlapping cards */}
          <div className="relative space-y-[-8px]">
            {/* Source Verification - Lavender */}
            <div className="relative z-30 bg-[#EDE9FE] rounded-3xl p-5 shadow-lg shadow-indigo-500/5 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-black text-[#5B21B6]">Source & Lateral Verification</h3>
                <p className="text-[11px] text-[#7C3AED]/70 mt-0.5">Cross-reference & fact-check skills</p>
              </div>
              <ProgressArc value={sourceCheckingScore} color="#7C3AED" />
            </div>

            {/* Phishing - Coral */}
            <div className="relative z-20 bg-[#FFE4E6] rounded-3xl p-5 shadow-lg shadow-rose-500/5 flex items-center justify-between ml-2">
              <div className="flex-1">
                <h3 className="text-sm font-black text-[#9F1239]">Phishing & Scam Defense</h3>
                <p className="text-[11px] text-[#E11D48]/60 mt-0.5">Spotting fraudulent messages & links</p>
              </div>
              <ProgressArc value={phishingScore} color="#E11D48" />
            </div>

            {/* Deepfake - Mint */}
            <div className="relative z-10 bg-[#D1FAE5] rounded-3xl p-5 shadow-lg shadow-emerald-500/5 flex items-center justify-between ml-4">
              <div className="flex-1">
                <h3 className="text-sm font-black text-[#065F46]">Deepfake & Audio Analysis</h3>
                <p className="text-[11px] text-emerald-700/60 mt-0.5">Identifying manipulated media</p>
              </div>
              <ProgressArc value={deepfakeScore} color="#059669" />
            </div>
          </div>

          {attempts.length === 0 ? (
            <p className="text-[11px] text-slate-400 mt-2 italic font-medium text-center">
              ✨ Skill arcs will fill up as you complete challenges.
            </p>
          ) : (
            <p className="text-[11px] text-amber-700 mt-2 italic font-medium text-center bg-amber-50 rounded-full px-4 py-1.5">
              🎯 Suggested focus area for your next Daily Challenge session.
            </p>
          )}
        </div>

        {/* Badges Section */}
        <div className="bg-white rounded-3xl p-6 shadow-lg shadow-indigo-500/5 space-y-4">
          <h3 className="text-base font-black text-[#1E1B4B]">Earned Sentinel Badges</h3>
          {attempts.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-indigo-200 rounded-2xl space-y-2 bg-indigo-50/30">
              <Award className="w-8 h-8 text-[#7C3AED]/30 mx-auto" />
              <p className="text-xs font-bold text-slate-500">No Badges Earned Yet</p>
              <p className="text-[11px] text-slate-400">Complete 1 Challenge to unlock &quot;First Responder&quot;</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-gradient-to-br from-[#EDE9FE] to-[#F3E8FF] rounded-2xl flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#5B21B6]">First Responder</h4>
                  <p className="text-[10px] text-[#7C3AED]/70">Completed 1st MIL Challenge</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

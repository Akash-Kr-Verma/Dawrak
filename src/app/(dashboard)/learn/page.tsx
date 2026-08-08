// src/app/(dashboard)/learn/page.tsx
//
// The Learn tab: the ten finalized modules, in delivery order.
//
// This replaced a hardcoded five-lesson "Module 1" syllabus that read from a
// `user_module_progress` table which did not exist in the schema (the query
// failed silently and fell back to local state, so progress never persisted).
// That table exists now, and the content comes from the DB.
"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useModuleList } from "@/hooks/useModules";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  CheckCircle2,
  Loader2,
  TrendingUp,
  AlertTriangle,
  SkipForward,
  Phone,
  Smartphone,
  MessageSquare,
  BarChart3,
  ShoppingBag,
  Heart,
  GraduationCap,
  Users,
  Wallet,
} from "lucide-react";
import type { ModuleFormat } from "@/types/modules";

const FORMAT_ICON: Record<ModuleFormat, React.ElementType> = {
  sms_plus_landing_page: Smartphone,
  marketplace_listing: ShoppingBag,
  interactive_call: Phone,
  social_post_plus_donation_page: Heart,
  dm_plus_portal: GraduationCap,
  forwarded_message: MessageSquare,
  social_post_with_chart: BarChart3,
  interactive_payment_screen: Wallet,
  group_chat: Users,
};

const FORMAT_LABEL: Record<ModuleFormat, string> = {
  sms_plus_landing_page: "Message + page",
  marketplace_listing: "Listing",
  interactive_call: "Live call",
  social_post_plus_donation_page: "Post + page",
  dm_plus_portal: "DM + portal",
  forwarded_message: "Forward",
  social_post_with_chart: "Post + chart",
  interactive_payment_screen: "Payment screen",
  group_chat: "Group chat",
};

export default function LearnPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { modules, progress, loading, error } = useModuleList(user?.id);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  // A penalty-free skip counts as done — that is the point of the flag.
  const doneCount = modules.filter((m) => {
    const p = progress[m.id];
    return p?.status === "completed" || (p?.status === "skipped" && p.skipped_without_penalty);
  }).length;

  const nextModule = modules.find((m) => {
    const p = progress[m.id];
    return !p || (p.status !== "completed" && p.status !== "skipped");
  });

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Welcome, {profile?.full_name || user?.email?.split("@")[0] || "Changemaker"}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Ten situations. Judge each one, then find out what was really going on.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-800 shrink-0">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>
              {doneCount} of {modules.length} done
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
            {error}
          </div>
        )}

        {nextModule && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider rounded-full">
              {doneCount === 0 ? "Start here" : "Up next"}
            </span>
            <h2 className="text-xl font-black text-slate-900 leading-snug">
              {nextModule.title}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{FORMAT_LABEL[nextModule.format]}</span>
              <span>·</span>
              <span>~{Math.round(nextModule.est_seconds / 60)} min</span>
              <span>·</span>
              <span>Difficulty {nextModule.difficulty}/5</span>
            </div>
            <Link
              href={`/learn/${nextModule.slug}`}
              className="inline-flex px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Begin
            </Link>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900">All modules</h3>
          <div className="space-y-2">
            {modules.map((m) => {
              const p = progress[m.id];
              const skipped = p?.status === "skipped";
              const done = p?.status === "completed";
              const Icon = FORMAT_ICON[m.format];

              return (
                <Link
                  key={m.id}
                  href={`/learn/${m.slug}`}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    done
                      ? "bg-emerald-50/60 border-emerald-200"
                      : skipped
                      ? "bg-slate-50 border-slate-200"
                      : "bg-slate-50/50 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {done ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : skipped ? (
                      <SkipForward className="w-5 h-5 text-slate-400 shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                        {m.sequence_order}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                        {m.title}
                        {m.content_warning && (
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <Icon className="w-3 h-3" />
                        {FORMAT_LABEL[m.format]} · ~{Math.round(m.est_seconds / 60)} min ·
                        difficulty {m.difficulty}/5
                      </p>
                      {/* Completing one module unlocks mentoring for that
                          module alone — surfaced here, where it is earned. A
                          penalty-free skip does not unlock it. */}
                      {done && (
                        <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                          <Users className="w-3 h-3" />
                          You can mentor this
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 shrink-0">
                    {done ? "Review" : skipped ? "Try it" : "Start"}
                  </span>
                </Link>
              );
            })}
          </div>

          {modules.length === 0 && !error && (
            <p className="text-sm text-slate-500">
              No modules published yet. Run{" "}
              <code className="font-mono text-xs">supabase/seed_modules.sql</code>.
            </p>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

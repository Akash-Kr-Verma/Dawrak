// src/app/(dashboard)/learn/page.tsx
//
// The Learn tab: the ten finalized modules, in delivery order.
//
// This replaced a hardcoded five-lesson "Module 1" syllabus that read from a
// `user_module_progress` table which did not exist in the schema (the query
// failed silently and fell back to local state, so progress never persisted).
// That table exists now, and the content comes from the DB.
//
// The screen answers three questions in order, top to bottom: how far along am
// I, what do I do next, and what does the whole path look like.
"use client";

import React from "react";
import Link from "next/link";
import { useAuth, displayName } from "@/hooks/useAuth";
import { useModuleList } from "@/hooks/useModules";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  Card,
  PageLoader,
  ProgressBar,
  Badge,
  LinkButton,
  SectionHeader,
} from "@/components/ui";
import {
  CheckCircle2,
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
  ArrowRight,
  Trophy,
  PlayCircle,
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

  if (authLoading || loading) return <PageLoader label="Loading your modules" />;

  // A penalty-free skip counts as done — that is the point of the flag.
  const doneCount = modules.filter((m) => {
    const p = progress[m.id];
    return (
      p?.status === "completed" ||
      (p?.status === "skipped" && p.skipped_without_penalty)
    );
  }).length;

  const completedCount = modules.filter(
    (m) => progress[m.id]?.status === "completed"
  ).length;

  const nextModule = modules.find((m) => {
    const p = progress[m.id];
    return !p || (p.status !== "completed" && p.status !== "skipped");
  });

  const total = modules.length;
  const pct = total > 0 ? (doneCount / total) * 100 : 0;
  const allDone = total > 0 && !nextModule;

  return (
    <ProtectedRoute>
      <div className="space-y-5 animate-fade-up">
        {/* ---- Progress banner: where am I ---------------------------- */}
        {/* data-tour marks the fallback anchor for the guided tour's Learn
            step, and is also what tells the tour this screen has painted. */}
        <section
          data-tour="learn-progress"
          className="rounded-2xl bg-brand-600 text-white p-5 sm:p-6 shadow-pop"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-brand-100 text-xs font-bold uppercase tracking-wider">
                Your journey
              </p>
              <h1 className="text-2xl font-black tracking-tight mt-1 truncate">
                Hey {displayName(profile, user?.email)}
              </h1>
              <p className="text-sm text-brand-100 mt-1 leading-relaxed">
                Ten real modules. Judge each one, then find out what was
                really going on.
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-black leading-none tabular-nums">
                {doneCount}
                <span className="text-brand-100 text-lg">/{total}</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-100 mt-1">
                Done
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div
              className="h-2.5 w-full rounded-full bg-brand-800 overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Modules completed"
            >
              <div
                className="h-full rounded-full bg-white transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            {completedCount > 0 && (
              <p className="text-xs text-brand-100 mt-2 font-medium">
                {completedCount} module{completedCount === 1 ? "" : "s"} finished
                — you can mentor {completedCount === 1 ? "it" : "any of them"}.
              </p>
            )}
          </div>
        </section>

        {error && (
          <div className="bg-spark-50 border border-spark-100 rounded-2xl p-4 text-sm text-spark-700 font-medium">
            {error}
          </div>
        )}

        {/* ---- What do I do next ------------------------------------- */}
        {nextModule && (
          <Card accent="brand" padded={false} data-tour="learn-next">
            <div className="p-5 sm:p-6">
              <Badge tone={doneCount === 0 ? "brand" : "spark"} icon={PlayCircle}>
                {doneCount === 0 ? "Start here" : "Up next"}
              </Badge>

              <h2 className="text-xl font-black text-ink leading-snug mt-3">
                {nextModule.title}
              </h2>

              {/* Difficulty and estimated time used to sit here. Neither helped
                  anyone decide anything — a difficulty score before you've seen
                  the scenario is just a warning, and "~2 min" is a promise the
                  interactive modules don't keep. Nothing replaces them. */}
              <div className="flex items-center gap-2 mt-2 text-xs text-ink-muted font-medium">
                {React.createElement(FORMAT_ICON[nextModule.format], {
                  className: "w-4 h-4",
                })}
                {FORMAT_LABEL[nextModule.format]}
                {nextModule.content_warning && (
                  <span className="inline-flex items-center gap-1 text-spark-700 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Sensitive
                  </span>
                )}
              </div>

              <LinkButton
                href={`/learn/${nextModule.slug}`}
                size="lg"
                iconRight={ArrowRight}
                className="mt-5"
                full
              >
                {doneCount === 0 ? "Begin your first module" : "Continue"}
              </LinkButton>
            </div>
          </Card>
        )}

        {allDone && (
          <Card accent="success">
            <div className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-2xl bg-success-50 border border-success-100 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-success-600" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-ink">
                  All ten done. That&apos;s the whole path.
                </h2>
                <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                  Now pass it on — share a module you&apos;ve mastered and
                  reply to whoever answers it.
                </p>
                <LinkButton
                  href="/mentor"
                  tone="mentor"
                  size="md"
                  iconRight={ArrowRight}
                  className="mt-4"
                >
                  Open Mentor Hub
                </LinkButton>
              </div>
            </div>
          </Card>
        )}

        {/* ---- The whole path ---------------------------------------- */}
        <Card padded={false}>
          <div className="p-5 sm:p-6 pb-3">
            <SectionHeader
              title="All modules"
              subtitle="Work through them in order, or jump to any one."
            />
          </div>

          {modules.length === 0 && !error ? (
            <div className="px-5 sm:px-6 pb-6">
              <p className="text-sm text-ink-muted">
                No modules published yet. Run{" "}
                <code className="font-mono text-xs bg-surface-sunken px-1.5 py-0.5 rounded">
                  supabase/seed_modules.sql
                </code>
                .
              </p>
            </div>
          ) : (
            <ul className="divide-line border-t border-line">
              {modules.map((m) => {
                const p = progress[m.id];
                const skipped = p?.status === "skipped";
                const done = p?.status === "completed";
                const isNext = nextModule?.id === m.id;
                const Icon = FORMAT_ICON[m.format];

                return (
                  <li key={m.id}>
                    <Link
                      href={`/learn/${m.slug}`}
                      className={`flex items-center gap-3 px-5 sm:px-6 py-4 transition-colors ${
                        isNext ? "bg-brand-50" : "hover:bg-surface-sunken"
                      }`}
                    >
                      {/* Status marker doubles as the sequence number. */}
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${
                          done
                            ? "bg-success-600 text-white"
                            : skipped
                            ? "bg-surface-sunken text-ink-faint border border-line"
                            : isNext
                            ? "bg-brand-600 text-white"
                            : "bg-surface-sunken text-ink-muted border border-line"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : skipped ? (
                          <SkipForward className="w-4 h-4" />
                        ) : (
                          m.sequence_order
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-ink truncate">
                            {m.title}
                          </span>
                          {m.content_warning && (
                            <AlertTriangle className="w-3.5 h-3.5 text-spark-600 shrink-0" />
                          )}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-ink-muted mt-0.5">
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          {FORMAT_LABEL[m.format]}
                        </span>
                        {/* Completing one module unlocks mentoring for that
                            module alone — surfaced here, where it is earned. A
                            penalty-free skip does not unlock it. */}
                        {done && (
                          <span className="flex items-center gap-1 text-xs text-mentor-700 font-bold mt-1">
                            <Users className="w-3.5 h-3.5" />
                            You can mentor this
                          </span>
                        )}
                      </span>

                      <span
                        className={`text-xs font-extrabold shrink-0 ${
                          isNext ? "text-brand-700" : "text-ink-muted"
                        }`}
                      >
                        {done ? "Review" : skipped ? "Try it" : "Start"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}

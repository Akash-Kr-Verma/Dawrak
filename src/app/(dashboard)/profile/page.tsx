// src/app/(dashboard)/profile/page.tsx
//
// The learner's own record.
//
// This screen used to read the `attempts` table alone — Daily Challenge
// attempts — so somebody who had worked through every learning module still saw
// an empty profile telling them they had done nothing. Module progress comes
// from `user_module_progress` via the same hook the Learn tab uses, so the two
// screens can never disagree about what is finished.
//
// Everything here is computed from rows this user actually has. There is no
// placeholder progress: when a section has nothing to show it says so and
// points at the screen that would fill it.
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, displayName } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useModuleList } from "@/hooks/useModules";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  Card,
  SectionHeader,
  Badge,
  Button,
  LinkButton,
  ProgressBar,
  EmptyState,
  StatTile,
  Avatar,
  PageLoader,
  type Tone,
} from "@/components/ui";
import {
  LogOut,
  Award,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Target,
  Flame,
  Users,
  Trophy,
  Sprout,
} from "lucide-react";

interface AttemptStat {
  ai_score: number;
  scenario_category?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, logout } = useAuth();
  const [attempts, setAttempts] = useState<AttemptStat[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Module progress — the half this screen used to be blind to.
  const { modules, progress, loading: modulesLoading } = useModuleList(user?.id);

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

  // Unchanged: level and points are still derived from Challenge attempts.
  const dynamicLevel = Math.floor(attempts.length / 3) + 1;
  const dynamicPoints = attempts.reduce((acc, cur) => acc + cur.ai_score, 0);

  const completedModules = modules.filter(
    (m) => progress[m.id]?.status === "completed"
  );
  const skippedFree = modules.filter(
    (m) =>
      progress[m.id]?.status === "skipped" &&
      progress[m.id]?.skipped_without_penalty
  ).length;
  const doneCount = completedModules.length + skippedFree;
  const modulePct = modules.length ? (doneCount / modules.length) * 100 : 0;

  const hasAnyActivity = attempts.length > 0 || doneCount > 0;

  // Badges, each earned off a row that exists.
  const badges: {
    name: string;
    note: string;
    icon: React.ElementType;
    tone: Tone;
  }[] = [];
  if (attempts.length >= 1)
    badges.push({
      name: "First Responder",
      note: "Completed your 1st Daily Challenge",
      icon: Award,
      tone: "spark",
    });
  if (completedModules.length >= 1)
    badges.push({
      name: "First Situation",
      note: "Finished your 1st learning module",
      icon: BookOpen,
      tone: "brand",
    });
  if (completedModules.length >= 1)
    badges.push({
      name: "Ready to Mentor",
      note: "Unlocked sharing for a module you finished",
      icon: Users,
      tone: "mentor",
    });
  if (completedModules.length >= 5)
    badges.push({
      name: "Halfway There",
      note: "Finished 5 learning modules",
      icon: Sprout,
      tone: "success",
    });
  if (modules.length > 0 && completedModules.length >= modules.length)
    badges.push({
      name: "Full Circle",
      note: "Finished all ten situations",
      icon: Trophy,
      tone: "success",
    });
  if (attempts.length >= 5)
    badges.push({
      name: "On a Roll",
      note: "Completed 5 Daily Challenges",
      icon: Flame,
      tone: "danger",
    });

  if (authLoading || loadingStats || modulesLoading)
    return <PageLoader label="Loading your profile" />;

  const name = displayName(profile, user?.email);

  return (
    <ProtectedRoute>
      <div className="space-y-5 animate-fade-up">
        {/* ---- Identity ---------------------------------------------- */}
        <Card accent="brand">
          <div className="flex items-start gap-4">
            <Avatar url={profile?.avatar_url} name={name} size={72} ring />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black text-ink truncate">{name}</h1>
              <p className="text-xs text-ink-muted font-medium truncate">
                {profile?.email || user?.email}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <Badge tone="brand" icon={CheckCircle2}>
                  Level {dynamicLevel}
                </Badge>
                <Badge tone="spark" icon={Target}>
                  {dynamicPoints} pts
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              aria-label="Log out"
              title="Log out"
              className="shrink-0"
              icon={LogOut}
            >
              <span className="sr-only sm:not-sr-only">Log out</span>
            </Button>
          </div>
        </Card>

        {/* ---- Nothing yet ------------------------------------------- */}
        {!hasAnyActivity && (
          <Card accent="brand">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-black text-ink">
                  Your record starts with one module
                </h2>
                <p className="text-sm text-ink-muted mt-1 leading-relaxed">
                  Finish a learning module and your progress, skills and badges
                  all begin filling in here.
                </p>
              </div>
              <LinkButton
                href="/learn"
                size="md"
                iconRight={ArrowRight}
                className="shrink-0"
              >
                Start learning
              </LinkButton>
            </div>
          </Card>
        )}

        {/* ---- The numbers ------------------------------------------- */}
        {hasAnyActivity && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile
              label="Modules"
              value={`${doneCount}/${modules.length}`}
              icon={BookOpen}
              tone="brand"
            />
            <StatTile
              label="Challenges"
              value={attempts.length}
              icon={Target}
              tone="spark"
            />
            <StatTile
              label="Points"
              value={dynamicPoints}
              icon={TrendingUp}
              tone="success"
            />
            <StatTile
              label="Badges"
              value={badges.length}
              icon={Award}
              tone="mentor"
            />
          </div>
        )}

        {/* ---- Learning journey -------------------------------------- */}
        <Card>
          <SectionHeader
            icon={BookOpen}
            tone="brand"
            title="Learning journey"
            subtitle="The ten modules, and where you are in them."
            right={
              <span className="text-sm font-black text-ink tabular-nums">
                {Math.round(modulePct)}%
              </span>
            }
          />
          <ProgressBar
            value={modulePct}
            tone="brand"
            className="mt-4"
            label="Modules completed"
          />

          {completedModules.length === 0 ? (
            <p className="text-xs text-ink-muted mt-3">
              Nothing finished yet.{" "}
              <Link href="/learn" className="text-brand-700 font-bold underline">
                Pick one to start
              </Link>
              .
            </p>
          ) : (
            <>
              <ul className="mt-4 space-y-2">
                {completedModules.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-2.5 rounded-xl border border-success-100 bg-success-50 px-3 py-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-success-600 shrink-0" />
                    <span className="text-xs font-bold text-ink truncate flex-1">
                      {m.title}
                    </span>
                    <span className="text-[11px] font-bold text-mentor-700 shrink-0">
                      Mentorable
                    </span>
                  </li>
                ))}
              </ul>
              {completedModules.length > 0 && (
                <LinkButton
                  href="/mentor"
                  tone="mentor"
                  variant="outline"
                  size="sm"
                  iconRight={ArrowRight}
                  className="mt-4"
                >
                  Share one with someone
                </LinkButton>
              )}
            </>
          )}
        </Card>

        {/* ---- Skills ------------------------------------------------ */}
        <Card>
          <SectionHeader
            icon={TrendingUp}
            tone="success"
            title="Skill analytics"
            subtitle="Averaged across the Daily Challenges you've answered."
            right={
              attempts.length > 0 ? (
                <Badge tone="success">{avgLogicScore}% avg</Badge>
              ) : undefined
            }
          />

          {attempts.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={Target}
                tone="spark"
                title="No challenges answered yet"
                action={
                  <LinkButton href="/challenge" tone="spark" size="sm">
                    Try today&apos;s situation
                  </LinkButton>
                }
              >
                These three bars fill in from your Daily Challenge answers — they
                stay at zero until you&apos;ve submitted one.
              </EmptyState>
            </div>
          ) : (
            <div className="space-y-4 mt-5">
              {(
                [
                  ["Source & lateral verification", sourceCheckingScore, "success"],
                  ["Phishing & scam defence", phishingScore, "brand"],
                  ["Deepfake & audio analysis", deepfakeScore, "spark"],
                ] as const
              ).map(([label, score, tone]) => (
                <div key={label}>
                  <div className="flex justify-between items-baseline text-xs font-bold text-ink mb-1.5">
                    <span>{label}</span>
                    <span className="tabular-nums">{score}%</span>
                  </div>
                  <ProgressBar value={score} tone={tone} label={label} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ---- Badges ------------------------------------------------ */}
        <Card>
          <SectionHeader
            icon={Award}
            tone="spark"
            title="Badges"
            subtitle={
              badges.length > 0
                ? `${badges.length} earned so far.`
                : "Earned from what you actually finish."
            }
          />

          {badges.length === 0 ? (
            <div className="mt-4">
              <EmptyState icon={Award} tone="spark" title="No badges yet">
                Finish one learning module or one Daily Challenge and your first
                badge lands here.
              </EmptyState>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              {badges.map((b) => {
                const Icon = b.icon;
                const soft: Record<Tone, string> = {
                  brand: "bg-brand-50 border-brand-100",
                  mentor: "bg-mentor-50 border-mentor-100",
                  spark: "bg-spark-50 border-spark-100",
                  success: "bg-success-50 border-success-100",
                  danger: "bg-danger-50 border-danger-100",
                  info: "bg-info-50 border-info-100",
                };
                const solid: Record<Tone, string> = {
                  brand: "bg-brand-600",
                  mentor: "bg-mentor-600",
                  spark: "bg-spark-600",
                  success: "bg-success-600",
                  danger: "bg-danger-600",
                  info: "bg-info-600",
                };
                return (
                  <div
                    key={b.name}
                    className={`p-3.5 rounded-xl border flex items-center gap-3 animate-pop-in ${soft[b.tone]}`}
                  >
                    <span
                      className={`w-11 h-11 rounded-xl text-white flex items-center justify-center shrink-0 ${solid[b.tone]}`}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-ink truncate">
                        {b.name}
                      </h4>
                      <p className="text-[11px] text-ink-muted leading-snug">
                        {b.note}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}

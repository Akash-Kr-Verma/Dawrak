// src/components/MentorLeaderboard.tsx
//
// The mentoring leaderboard, rendered in full.
//
// It ranks one thing: people taught. Not modules finished, not points, not
// streaks — those are already on the Profile, and none of them require anyone
// else to be involved. A place on this board costs you a conversation with a
// real person, which is the entire premise of Dawrak.
//
// A row means: they finished a module, shared it with someone outside the
// app, that person answered it, and they wrote back. Plus any in-person session
// logged before that flow was retired. Counting rule:
// supabase/migrations/0008_mentor_leaderboard.sql.
//
// Lives in a component rather than in either page because it is shown whole in
// two places — inline on the Profile, and at /profile/leaderboard — and the
// board saying two different things in two places would be worse than either.
"use client";

import React from "react";
import type { LeaderboardEntry, MyMentorImpact } from "@/types/mentor";
import { Badge, EmptyState, LinkButton, Avatar } from "@/components/ui";
import {
  ArrowRight,
  BookOpen,
  Heart,
  Share2,
  UserPlus,
} from "lucide-react";

/** The idea the number stands for, in three steps. Without it the board reads
 *  as a generic points table, which is the one thing it is not. */
export function ChainStrip() {
  const steps = [
    { icon: BookOpen, label: "Learn", note: "finish a module" },
    { icon: Share2, label: "Teach", note: "one real person" },
    { icon: Heart, label: "Multiply", note: "they pass it on" },
  ];
  return (
    <ol className="flex items-stretch gap-2 overflow-x-auto">
      {steps.map((s, i) => {
        const Icon = s.icon;
        return (
          <li key={s.label} className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex flex-col items-center text-center flex-1 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-mentor-600 text-white flex items-center justify-center mb-1.5 shrink-0">
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-extrabold text-ink leading-tight">
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
  );
}

/** One of the top three. The leader gets the amber tone the rest of the app
 *  uses for "worth your attention"; second and third stay neutral rather than
 *  inventing silver and bronze, which are not colours this design system has. */
export function PodiumTile({
  row,
  isYou,
}: {
  row: LeaderboardEntry;
  isYou: boolean;
}) {
  const lead = row.rank === 1;
  return (
    <div
      className={`rounded-xl border p-4 flex flex-col items-center text-center gap-2 ${
        isYou
          ? "border-brand-600 bg-brand-50"
          : lead
          ? "border-spark-100 bg-spark-50"
          : "border-line bg-surface-sunken"
      }`}
    >
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black tabular-nums ${
          lead ? "bg-spark-700 text-white" : "bg-surface border border-line text-ink"
        }`}
      >
        {row.rank}
      </span>
      <Avatar url={row.avatar_url} name={row.display_name} size={48} />
      <p className="text-sm font-extrabold text-ink truncate max-w-full">
        {row.display_name}
      </p>
      <p className="text-xs text-ink-soft font-bold">
        <span className="tabular-nums">{row.people_taught}</span>{" "}
        {row.people_taught === 1 ? "person taught" : "people taught"}
      </p>
      {isYou && (
        <Badge tone="brand" solid>
          You
        </Badge>
      )}
    </div>
  );
}

/** A single ranked line. The current user's row is the only one that gets the
 *  brand colour, so finding yourself takes no reading. */
export function LeaderboardRow({
  row,
  isYou,
}: {
  row: LeaderboardEntry;
  isYou: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
        isYou ? "border-brand-600 bg-brand-50" : "border-line bg-surface"
      }`}
    >
      <span className="w-7 text-sm font-black text-ink-soft tabular-nums text-center shrink-0">
        {row.rank > 0 ? row.rank : "—"}
      </span>
      <Avatar url={row.avatar_url} name={row.display_name} size={32} />
      <span className="min-w-0 flex-1 flex items-center gap-2">
        <span className="text-sm font-bold text-ink truncate">
          {row.display_name}
        </span>
        {isYou && (
          <Badge tone="brand" solid>
            You
          </Badge>
        )}
      </span>
      <span className="text-sm font-black text-ink tabular-nums shrink-0">
        {row.people_taught}
      </span>
    </li>
  );
}

/**
 * The whole board: top three, then everyone else.
 *
 * `myRow` is appended when the signed-in user is not already in `rows` — the
 * board always answers "and where am I?", including at zero, where the honest
 * answer is "not yet, here is how".
 */
export function MentorLeaderboard({
  rows,
  me,
  currentUserId,
  myRow,
}: {
  rows: LeaderboardEntry[];
  me: MyMentorImpact | null;
  currentUserId?: string;
  /** The caller's own line, used only when they are outside `rows`. */
  myRow?: LeaderboardEntry;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        tone="mentor"
        title="Nobody has taught anyone yet"
        action={
          <LinkButton href="/mentor" tone="mentor" size="sm" iconRight={ArrowRight}>
            Be the first
          </LinkButton>
        }
      >
        Finish a module, share it with one person, and reply to what they send
        back. That puts the first name on this board.
      </EmptyState>
    );
  }

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const inBoard = rows.some((r) => r.user_id === currentUserId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {podium.map((row) => (
          <PodiumTile
            key={row.user_id}
            row={row}
            isYou={row.user_id === currentUserId}
          />
        ))}
      </div>

      {(rest.length > 0 || (!inBoard && myRow)) && (
        <ul className="space-y-2">
          {rest.map((row) => (
            <LeaderboardRow
              key={row.user_id}
              row={row}
              isYou={row.user_id === currentUserId}
            />
          ))}

          {/* The caller, pinned below the list when they did not make it. */}
          {!inBoard && myRow && (
            <>
              <li className="flex items-center gap-2 pt-1">
                <span className="h-px flex-1 bg-line" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">
                  Your standing
                </span>
                <span className="h-px flex-1 bg-line" />
              </li>
              <LeaderboardRow row={myRow} isYou />
            </>
          )}
        </ul>
      )}

      {/* What moving up costs, stated plainly. One person, every time. */}
      {me && (
        <p className="text-xs text-ink-muted leading-relaxed">
          {me.people_taught === 0
            ? "Teach one person and you are on this board."
            : me.rank === 1
            ? "You are top of the board. Every person you teach keeps it going."
            : "One more person and you move up."}
        </p>
      )}
    </div>
  );
}

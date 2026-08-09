// src/app/api/challenge/next/route.ts
//
// Serves the next Daily Challenge for the signed-in learner.
//
// Two things this does that the old flow did not:
//
//   1. It returns a scenario that exists as a row. `attempts.scenario_id` is a
//      foreign key; the previous flow minted ids like `ai-live-1723-457` in
//      memory, so no attempt against a generated scenario could ever be stored.
//      Anything generated here is written to `scenarios` first and the real uuid
//      is returned.
//
//   2. It never returns the verdict. The learner is about to judge the claim;
//      putting the answer in the response would put it in their network tab.
//      The verdict comes back from /api/feedback once they have answered.
//
// Auth follows /api/modules/grade: the caller's access token builds the Supabase
// client, so every write runs as that user and RLS enforces ownership. No
// service-role key is used or wanted.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateScenario } from "@/lib/challenge/generateScenario";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** Columns safe to send before the learner has judged — no `verdict`. */
const FEED_COLUMNS =
  "id, title, body_context, category, media_url, media_type, " +
  "original_publisher, source_channel, viral_reach, date_str, origin, " +
  "is_community_submitted, submitted_by_name, created_at";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing Authorization bearer token" },
      { status: 401 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Prefer something authored — seed or Questions Bank — that this learner
    // has not already attempted. Bank submissions sort first so community
    // material actually gets seen.
    const { data: pickedId } = await supabase.rpc("next_challenge_for", {
      p_user_id: user.id,
    });

    if (pickedId) {
      const { data: row, error: rowErr } = await supabase
        .from("challenge_feed")
        .select(FEED_COLUMNS)
        .eq("id", pickedId)
        .single();
      if (!rowErr && row) {
        return NextResponse.json({
          ...(row as unknown as Record<string, unknown>),
          source: "bank",
        });
      }
    }

    // Nothing unseen left: generate one and persist it so the attempt can
    // reference it. origin='ai_generated' keeps it out of next_challenge_for,
    // so it is never re-served as if it were authored material.
    const generated = await generateScenario();

    const { data: inserted, error: insErr } = await supabase
      .from("scenarios")
      .insert({
        title: generated.title,
        body_context: generated.body_context,
        category: generated.category,
        verdict: generated.verdict,
        media_url: generated.media_url ?? null,
        media_type: generated.media_type,
        original_publisher: generated.original_publisher,
        source_channel: generated.source_channel,
        viral_reach: generated.viral_reach,
        date_str: generated.date_str,
        origin: "ai_generated",
        is_community_submitted: false,
      })
      .select(FEED_COLUMNS.replace(", submitted_by_name", ""))
      .single();

    if (insErr || !inserted) {
      // Persisting failed, so an attempt could not be stored against this
      // scenario. Say so rather than handing back an unusable card.
      console.error("[/api/challenge/next] scenario insert failed:", insErr);
      return NextResponse.json(
        {
          error:
            "Could not prepare a challenge. If the database migrations have " +
            "not been applied yet, run supabase/migrations/0004_challenge.sql.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ...(inserted as unknown as Record<string, unknown>),
      submitted_by_name: null,
      source: "generated",
    });
  } catch (err: any) {
    console.error("[/api/challenge/next] failed:", err);
    return NextResponse.json(
      { error: err?.message ?? "Could not load a challenge." },
      { status: 500 }
    );
  }
}

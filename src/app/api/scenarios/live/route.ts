// src/app/api/scenarios/live/route.ts
//
// Generates a fresh MIL claim with no auth and no persistence.
//
// The Challenge tab no longer uses this — it calls /api/challenge/next, which
// stores what it generates so an attempt can reference it. This route is kept
// as the unauthenticated preview of the generator (useful for demos and for
// checking the AI path without signing in), and now shares one implementation
// with it rather than keeping a second copy of the prompt and fallback bank.
//
// Because nothing here is persisted, the ids it returns are not scenario uuids
// and must not be sent to /api/feedback.

import { NextResponse } from "next/server";
import { generateScenario } from "@/lib/challenge/generateScenario";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const s = await generateScenario();

  return NextResponse.json({
    // Prefixed, not a uuid, and deliberately so: /api/feedback rejects anything
    // that is not a stored scenario's uuid.
    id: `preview-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: s.title,
    body_context: s.body_context,
    category: s.category,
    verdict: s.verdict,
    original_publisher: s.original_publisher,
    mediaType: s.media_type,
    mediaUrl: s.media_url,
    sourceChannel: s.source_channel,
    viralReach: s.viral_reach,
    dateStr: s.date_str,
    persisted: false,
  });
}

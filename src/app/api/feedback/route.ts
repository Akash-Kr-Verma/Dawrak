export const dynamic = "force-dynamic";

// src/app/api/feedback/route.ts
//
// Grades one Daily Challenge attempt and records it.
//
// Auth: the caller's access token builds the Supabase client and the learner is
// read from that token. This replaces a `userId` taken from the request body,
// which was unauthenticated — combined with the route's preference for
// SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS), any caller could have written
// attempts and awarded points as any user by changing one JSON field. Same
// pattern as /api/modules/grade now: no service-role key, RLS enforces
// ownership.
//
// The scenario's verdict is read from the database, not from the request. It
// used to arrive in `scenarioContext` from the client, which both told the
// browser the answer before the learner submitted and let the grader be fed a
// verdict of the caller's choosing.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const AI_TIMEOUT_MS = 15_000;


const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      scenarioId,
      assessment,
      userReasoning,
      sourceUrl,
      noSourceFound,
    } = body as {
      scenarioId?: string;
      assessment?: "real" | "fake" | "evidence";
      userReasoning?: string;
      sourceUrl?: string;
      noSourceFound?: boolean;
    };

    // ---- Auth ------------------------------------------------------------
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

    // ---- Validation ------------------------------------------------------
    if (!scenarioId || !UUID_RE.test(scenarioId)) {
      return NextResponse.json(
        { error: "scenarioId must be the uuid of a stored scenario" },
        { status: 400 }
      );
    }
    if (!assessment || !["real", "fake", "evidence"].includes(assessment)) {
      return NextResponse.json(
        { error: "assessment must be real, fake or evidence" },
        { status: 400 }
      );
    }
    if (
      !userReasoning ||
      typeof userReasoning !== "string" ||
      userReasoning.trim().length < 15
    ) {
      return NextResponse.json(
        { error: "userReasoning must be at least 15 characters long" },
        { status: 400 }
      );
    }
    if (!noSourceFound) {
      if (
        !sourceUrl ||
        typeof sourceUrl !== "string" ||
        !/^https?:\/\//i.test(sourceUrl)
      ) {
        return NextResponse.json(
          { error: "sourceUrl must be a valid http or https URL" },
          { status: 400 }
        );
      }
    }

    // ---- Load the scenario (the verdict comes from here, not the client) --
    const { data: scenario, error: scenarioError } = await supabase
      .from("scenarios")
      .select("id, title, body_context, category, verdict, origin")
      .eq("id", scenarioId)
      .single();

    if (scenarioError || !scenario) {
      return NextResponse.json(
        { error: "That scenario does not exist" },
        { status: 404 }
      );
    }

    // ---- Grade -----------------------------------------------------------
    const systemPrompt = `
You are an encouraging, expert Media Literacy AI Coach.
Evaluate the user's typed reasoning and their verification source against the correct verdict.

Grading Rubric:
1. Evaluate Reasoning (50% of score): analytical depth and identification of red flags.
2. Audit Source Credibility (50% of score): the provided verification source.

RULE 1 — GIBBERISH DETECTION: If userReasoning is random keyboard mashing, irrelevant filler, or under 15 words of genuine analysis, assign a score between 5 and 15, set verdictTitle to "Invalid Analysis — Gibberish Detected" and say so plainly in personalizedFeedback.

RULE 2 — SOURCE AUDIT:
- Empty, random, broken, or non-existent domain → "FAILED AUDIT: The provided link is not a recognized verification source. Cite reputable registries like Snopes, Reuters, or official institutional domains."
- Valid government (.gov), academic (.edu), or IFCN fact-checker domain (Reuters, Snopes, PolitiFact, BBC, AltNews, BoomLive) → commend it explicitly.
- Social media, unverified blog, or tabloid → deduct points and warn about secondary-source unreliability.

SPECIAL CASE — noSourceFound: true: the user asserts the claim is fake because no official announcement exists.
- Checked a relevant official domain → commend: "EXCELLENT LATERAL READING: You checked primary official channels ([Domain]) and identified that no such scheme or press release exists."
- Vague or irrelevant domain → coach them to name the specific portal.

RULE 3 — "needs more evidence" (assessment: evidence) is a legitimate answer, not a wrong one. Do not penalise withholding judgment; coach them on what evidence would settle it.
RULE 4: Quote or reference at least one phrase the user typed (unless gibberish).
RULE 5: Explicitly mention the source they provided in the source audit.

Return JSON:
{
  "score": <integer 0-100>,
  "verdictTitle": "<short badge>",
  "personalizedFeedback": "<coaching text referencing user words>",
  "sourceAudit": "<specific feedback on the source>",
  "keyLesson": "<actionable MIL takeaway>"
}
`;

    const userMessage = `
Scenario Context:
Title: ${scenario.title}
Correct verdict: ${scenario.verdict}

User's assessment: ${assessment}
User's Verification Source URL: "${sourceUrl ?? ""}"
noSourceFound Checked: ${!!noSourceFound}

User's Reasoning:
"${userReasoning}"
`;

    let result: any;
    let gradedBy: "ai" | "fallback" = "ai";

    try {
      const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("No AI API key configured");
      const openai = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI request timeout")), AI_TIMEOUT_MS)
      );

      const completion = (await Promise.race([
        openai.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
        timeoutPromise,
      ])) as OpenAI.Chat.Completions.ChatCompletion;

      result = JSON.parse(completion.choices[0]?.message?.content || "{}");

      if (typeof result.score !== "number") result.score = 50;
      result.score = Math.max(0, Math.min(100, Math.round(result.score)));
      if (!result.verdictTitle) result.verdictTitle = "Analysis Completed";
      if (!result.personalizedFeedback)
        result.personalizedFeedback = "Good effort analyzing this scenario.";
      if (!result.sourceAudit) result.sourceAudit = "Source evaluation completed.";
      if (!result.keyLesson) result.keyLesson = "Always verify the primary source.";
    } catch (aiError) {
      console.error("[/api/feedback] AI evaluation failed:", aiError);
      gradedBy = "fallback";
      result = {
        score: 50,
        verdictTitle: "Analysis Recorded — Coach Unavailable",
        personalizedFeedback:
          "Your reasoning was recorded, but the AI coach could not be reached this time, so this score is a placeholder rather than a judgment of your answer.",
        sourceAudit:
          "UNVERIFIED: your source could not be audited automatically this time.",
        keyLesson:
          "Always double-check the original source of any sensational claim.",
      };
    }

    // ---- Persist ---------------------------------------------------------
    const { error: insertError } = await supabase.from("attempts").insert({
      user_id: user.id,
      scenario_id: scenario.id,
      user_reasoning: userReasoning,
      ai_score: result.score,
      assessment,
      source_url: sourceUrl || null,
      no_source_found: !!noSourceFound,
      ai_feedback: result.personalizedFeedback,
      source_audit: result.sourceAudit,
      verdict_title: result.verdictTitle,
      key_lesson: result.keyLesson,
      graded_by: gradedBy,
    });

    if (insertError) {
      // Log it but still return the grade — a storage problem must not cost the
      // learner their feedback. Unlike before, this is now genuinely unexpected
      // rather than the guaranteed outcome of a hardcoded user id.
      console.error("[/api/feedback] attempt insert failed:", insertError);
    }

    // Points. Read-modify-write, as before — a race here costs a few points on
    // concurrent submissions, which is not worth an RPC at this stage.
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_points")
      .eq("id", user.id)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({ total_points: (profile.total_points || 0) + result.score })
        .eq("id", user.id);
    }

    const { data: streak } = await supabase.rpc("user_challenge_streak", {
      p_user_id: user.id,
    });

    // The verdict is released now, and only now: the learner has answered.
    return NextResponse.json(
      {
        ...result,
        gradedBy,
        actualVerdict: scenario.verdict,
        wasCorrect: assessment === scenario.verdict,
        streak: typeof streak === "number" ? streak : null,
        persisted: !insertError,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[/api/feedback] route error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase Client
// Using the service role key is recommended for backend operations to bypass RLS for inserting and updating points securely.
// If the service role key is not available, we fall back to the anon key.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize OpenAI Client (via Groq)
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, scenarioId, userReasoning, scenarioContext, sourceUrl, noSourceFound } = body;

    // 1. Input Payload Validation
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 });
    }
    if (!scenarioId || typeof scenarioId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid scenarioId' }, { status: 400 });
    }
    if (!userReasoning || typeof userReasoning !== 'string' || userReasoning.trim().length < 15) {
      return NextResponse.json({ error: 'userReasoning must be at least 15 characters long' }, { status: 400 });
    }
    if (!noSourceFound) {
      if (!sourceUrl || typeof sourceUrl !== 'string' || (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://'))) {
        return NextResponse.json({ error: 'sourceUrl must be a valid http or https URL' }, { status: 400 });
      }
    }
    if (!scenarioContext || typeof scenarioContext !== 'object') {
      return NextResponse.json({ error: 'Missing or invalid scenarioContext' }, { status: 400 });
    }

    // 2. LLM System Prompt & JSON Formatting
    const systemPrompt = `
You are an encouraging, expert Media Literacy AI Coach.
Your task is to evaluate the user's typed reasoning and their verification source against the correct verdict and the provided grading rubric.

Grading Rubric:
1. Evaluate Reasoning (50% of score): Check analytical depth and identification of red flags in their reasoning.
2. Audit Source Credibility (50% of score): Check the provided verification source URL.

RULE 1 — GIBBERISH / RANDOM TEXT DETECTION: If userReasoning is random keyboard mashing, irrelevant filler text, or under 15 words of genuine analysis, assign a score between 5 and 15. Set verdictTitle to "Invalid Analysis — Gibberish Detected" and explicitly state in personalizedFeedback: "Your submission appears to be random text rather than a critical media literacy analysis. To evaluate a claim, you must explain specific red flags..."

RULE 2 — SOURCE CREDIBILITY & FAKE LINK AUDIT: Check the sourceUrl string:
- If it is empty, random characters, a broken link, or a non-existent domain, set sourceAudit to: "FAILED AUDIT: The provided link is not a recognized or valid verification source. Always cite reputable registries like Snopes, Reuters, or official institutional domains."
- If it is a valid government (.gov), academic (.edu), or IFCN fact-checker domain (Reuters, Snopes, PolitiFact, BBC, AltNews, BoomLive), commend it explicitly.
- If it is a social media link, unverified blog, or tabloid, deduct points and explicitly warn the user about domain bias and secondary-source unreliability.

SPECIAL CASE: Absence of Official Source (noSourceFound: true):
If the user checked noSourceFound: true, they are asserting that this claim is a scam/fake because no official press release or notification exists on primary channels.
AI Evaluation Rule:
Verify Logical Channel: Did the user check the right official portal for this specific topic? (e.g., Checking education.gov.in for a laptop scheme, or rbi.org.in for a banking alert).
- If the user checked a relevant official domain: Highly commend them in sourceAudit! Response format: "EXCELLENT LATERAL READING: You correctly checked primary official channels ([Domain Name]) and identified that no such scheme or press release exists. Proving the absence of official confirmation is a key defense against WhatsApp forwards."
- If the user typed a non-relevant domain or left it vague: Coach them nicely in sourceAudit: "You correctly recognized that this scheme lacks official backing. However, to be thorough, specify which official portal you checked (for instance, the official Ministry of Education domain at education.gov.in) to confirm there was no notification."

Rule 3: Focus on the quality of reasoning and the credibility of the source. Be encouraging unless gibberish is detected.
Rule 4: You MUST explicitly quote or reference at least one phrase the user typed in their reasoning (unless it is gibberish).
Rule 5: You MUST explicitly mention the source URL they provided in your source audit.

Expected JSON Output Schema:
{
  "score": <Integer between 0 and 100>,
  "verdictTitle": "<Concise summary badge, e.g., Strong Analysis — Credible Source Cited>",
  "personalizedFeedback": "<Coaching text referencing user words>",
  "sourceAudit": "<Specific feedback on the source URL provided, e.g. VERIFIED CREDIBLE: The domain cited is an IFCN-certified signatory.>",
  "keyLesson": "<Actionable MIL takeaway>"
}
`;

    const userMessage = `
Scenario Context:
Title: ${scenarioContext.title || 'Unknown'}
Verdict: ${scenarioContext.verdict || 'Unknown'}

User's Verification Source URL:
"${sourceUrl}"
noSourceFound Checked: ${noSourceFound}

User's Reasoning:
"${userReasoning}"
`;

    let result;
    try {
      // Include a safety timeout to prevent hanging the request
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('OpenAI Request Timeout')), 15000)
      );

      const aiResponsePromise = openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      });

      const completion = await Promise.race([aiResponsePromise, timeoutPromise]) as OpenAI.Chat.Completions.ChatCompletion;
      
      const content = completion.choices[0]?.message?.content || '{}';
      result = JSON.parse(content);
      
      // Ensure expected fields exist
      if (typeof result.score !== 'number') result.score = 50;
      if (!result.verdictTitle) result.verdictTitle = "Analysis Completed";
      if (!result.personalizedFeedback) result.personalizedFeedback = "Good effort on analyzing this scenario.";
      if (!result.sourceAudit) result.sourceAudit = "Source evaluation completed.";
      if (!result.keyLesson) result.keyLesson = "Pro Tip: Always verify sources.";

    } catch (aiError) {
      console.error("❌ [/api/feedback] AI EVALUATION FAILED:", aiError);
      // Graceful fallback JSON response so UI never crashes
      result = {
        score: 50,
        verdictTitle: "Analysis Completed — Keep Practicing",
        personalizedFeedback: "You made a solid attempt at reasoning through this scenario. Let's keep refining your media literacy skills.",
        sourceAudit: "UNVERIFIED: We couldn't automatically verify your source this time.",
        keyLesson: "Pro Tip: Always double-check the original source of any sensational claim."
      };
    }

    // 3. Supabase Database Logging
    // Insert record into attempts table
    const { error: insertError } = await supabase
      .from('attempts')
      .insert({
        user_id: userId,
        scenario_id: scenarioId,
        user_reasoning: userReasoning,
        ai_score: result.score,
        // Note: If 'ai_feedback' is added to the schema later, you can uncomment the line below.
        // ai_feedback: result.personalizedFeedback
      });

    if (insertError) {
      console.error('Supabase Insert Error:', insertError);
      // We log the error but still return the AI response so the user isn't blocked
    }

    // Increment user's total_points in profiles table
    // (A fetch and update approach. In a strict prod environment, an RPC function is preferred to prevent race conditions)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('total_points')
      .eq('id', userId)
      .single();

    if (profile && !profileError) {
      const newPoints = (profile.total_points || 0) + result.score;
      await supabase
        .from('profiles')
        .update({ total_points: newPoints })
        .eq('id', userId);
    }

    // Return successful payload
    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error('Feedback API Route Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

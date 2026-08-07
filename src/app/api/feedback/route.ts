import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase Client
// Using the service role key is recommended for backend operations to bypass RLS for inserting and updating points securely.
// If the service role key is not available, we fall back to the anon key.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize OpenAI Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, scenarioId, userReasoning, scenarioContext } = body;

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
    if (!scenarioContext || typeof scenarioContext !== 'object') {
      return NextResponse.json({ error: 'Missing or invalid scenarioContext' }, { status: 400 });
    }

    // 2. LLM System Prompt & JSON Formatting
    const systemPrompt = `
You are an encouraging, expert Media Literacy AI Coach.
Your task is to evaluate the user's typed reasoning against the correct verdict and the provided grading rubric.

Rule 1 (No Binary Shaming): Focus on the quality of reasoning rather than just a right/wrong answer. Be encouraging.
Rule 2 (Specific Reference): You MUST explicitly quote or reference at least one phrase the user typed in their reasoning to show you read it.

Expected JSON Output Schema:
{
  "score": <Integer between 0 and 100 based on analytical depth>,
  "verdictTitle": "<Concise summary badge, e.g., Sharp Analysis — Red Flags Identified>",
  "personalizedFeedback": "<Coaching text referencing user words>",
  "keyLesson": "<Actionable MIL takeaway, e.g., Pro Tip: Always verify domain extensions>"
}
`;

    const userMessage = `
Scenario Context:
Title: ${scenarioContext.title || 'Unknown'}
Verdict: ${scenarioContext.verdict || 'Unknown'}
Grading Rubric: ${scenarioContext.gradingRubric ? JSON.stringify(scenarioContext.gradingRubric) : 'N/A'}

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
        model: 'gpt-4o-mini',
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
      if (!result.keyLesson) result.keyLesson = "Pro Tip: Always verify sources.";

    } catch (aiError) {
      console.error('AI Processing Error:', aiError);
      // Graceful fallback JSON response so UI never crashes
      result = {
        score: 50,
        verdictTitle: "Analysis Completed — Keep Practicing",
        personalizedFeedback: "You made a solid attempt at reasoning through this scenario. Let's keep refining your media literacy skills.",
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

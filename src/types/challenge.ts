// src/types/challenge.ts
//
// Daily Challenge and Questions Bank types.
// Schema: supabase/migrations/0004_challenge.sql.

export type ScenarioCategory =
  | "source_checking"
  | "deepfake"
  | "phishing"
  | "emotional_manipulation";

export type ScenarioOrigin = "seed" | "ai_generated" | "questions_bank";

/** What the client is given before the learner judges.
 *
 *  No `verdict`. It is released by /api/feedback once they have answered — the
 *  same reasoning as RUNNER_COLUMNS in useModules.ts. Note this is a discipline
 *  about what the app requests, not a security boundary: `scenarios` keeps a
 *  public read policy, so the column is technically reachable. The real
 *  boundary in this codebase is the anonymous share flow, where no table is
 *  readable at all. */
export interface ChallengeScenario {
  id: string;
  title: string;
  body_context: string | null;
  category: ScenarioCategory;
  media_url: string | null;
  media_type: "text" | "image" | "audio" | "video" | null;
  original_publisher: string | null;
  source_channel: string | null;
  viral_reach: string | null;
  date_str: string | null;
  origin: ScenarioOrigin;
  is_community_submitted: boolean;
  submitted_by_name: string | null;
  created_at: string;
  /** 'bank' = authored (seed or Questions Bank). 'generated' = made just now. */
  source?: "bank" | "generated";
}

/** The graded result. `actualVerdict` arrives only in this response. */
export interface ChallengeFeedback {
  score: number;
  verdictTitle: string;
  personalizedFeedback: string;
  sourceAudit: string;
  keyLesson?: string;
  gradedBy: "ai" | "fallback";
  actualVerdict: "real" | "fake";
  wasCorrect: boolean;
  streak: number | null;
  /** False when the attempt could not be stored — surfaced rather than hidden,
   *  because silently discarded attempts are exactly what went wrong before. */
  persisted: boolean;
}

/** A past Questions Bank situation, with how many learners spotted it. */
export interface BankScenario {
  id: string;
  title: string;
  category: ScenarioCategory;
  origin: ScenarioOrigin;
  submitted_by_name: string | null;
  created_at: string;
  attempts_total: number;
  /** Null until somebody has attempted it — not 0%, which would read as
   *  "everyone got it wrong". */
  spotted_pct: number | null;
}

export const CATEGORY_LABEL: Record<ScenarioCategory, string> = {
  source_checking: "Source checking",
  deepfake: "Deepfake",
  phishing: "Phishing",
  emotional_manipulation: "Emotional manipulation",
};

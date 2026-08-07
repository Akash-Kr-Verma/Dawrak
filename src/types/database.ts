export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_points: number;
  level: number;
  created_at: string;
}

export type ScenarioCategory =
  | "source_checking"
  | "deepfake"
  | "phishing"
  | "emotional_manipulation";

export interface Scenario {
  id: string;
  title: string;
  body_context: string | null;
  category: ScenarioCategory;
  media_url: string | null;
  verdict: "real" | "fake";
  is_community_submitted: boolean;
  submitted_by_profile_id: string | null;
  reports_count: number;
  is_hidden: boolean;
  created_at: string;
}

export interface Attempt {
  id: string;
  user_id: string;
  scenario_id: string;
  user_reasoning: string;
  ai_score: number;
  created_at: string;
}

export interface TaughtSession {
  id: string;
  mentor_id: string;
  scenario_id: string;
  student_name: string;
  proof_url: string | null;
  visitor_explanation: string | null;
  verified: boolean;
  completed_at: string;
}

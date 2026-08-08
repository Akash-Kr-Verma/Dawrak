// src/types/mentor.ts
//
// Mentoring types. The rule these encode: you may mentor a module you have
// completed, one module at a time — not "the Mentor Hub unlocks once you have
// done enough". See supabase/migrations/0003_mentoring.sql.

import type { ModuleFormat, ModuleGrade } from "@/types/modules";

/** A module the signed-in learner has completed, and may therefore share.
 *  Mirrors the `mentorable_modules` view. */
export interface MentorableModule {
  user_id: string;
  module_id: string;
  slug: string;
  title: string;
  format: ModuleFormat;
  difficulty: number;
  sequence_order: number;
  best_score: ModuleGrade | null;
  completed_at: string | null;
  /** Token of the live share link for this module, if one has been minted. */
  active_share_token: string | null;
}

/** An offline teaching session logged with proof. Pre-existing rows have a
 *  free-text `topic_taught` and no `module_id`; both stay legal. */
export interface MentoringSession {
  id: string;
  mentor_id: string;
  learner_name: string;
  relationship: string | null;
  topic_taught: string | null;
  proof_file_url: string | null;
  notes: string | null;
  module_id: string | null;
  created_at: string;
}

/** Someone outside the app answered a shared module. Awaiting a reply while
 *  `mentor_reply` is null. */
export interface ShareResponse {
  id: string;
  share_link_id: string;
  learner_verdict: "real" | "fake" | "accurate" | "misleading" | null;
  learner_reasoning: string | null;
  reason_chips: string[];
  recipient_email: string | null;
  mentor_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

/** A pending review as the Mentor Hub renders it: the response plus which
 *  module it came from. */
export interface PendingReview extends ShareResponse {
  module_title: string;
  module_slug: string;
  share_token: string;
}

/** What `get_share_link` returns to an anonymous recipient.
 *
 *  Everything that would answer the question for them is withheld — no verdict,
 *  no signals, no rubric, no reveal, no canonical_reasoning. The recipient is
 *  being asked to judge; handing them the answer key would defeat the exercise
 *  and make the mentor's reply pointless. */
export interface PublicShareLink {
  module_slug: string;
  module_title: string;
  prompt_text: string;
  question_variant: string | null;
  verdict_labels: { positive: string; negative: string };
  content_warning: boolean;
  content_warning_text: string | null;
  mentor_name: string;
}

/** What `get_share_response` returns to the recipient holding the receipt. */
export interface PublicShareResponse {
  learner_verdict: string | null;
  learner_reasoning: string | null;
  reason_chips: string[];
  mentor_reply: string | null;
  replied_at: string | null;
  module_title: string;
  mentor_name: string;
}

/** The four generic prompts offered to a recipient, from share-view_3.html.
 *
 *  Deliberately generic. Offering the module's own signal list would hand over
 *  the reasoning we are asking them to produce. */
export const REASON_CHIPS: { id: string; label: string }[] = [
  { id: "source", label: "No credible source" },
  { id: "urgency", label: "Rushed / countdown pressure" },
  { id: "info", label: "Asks for personal info" },
  { id: "tone", label: "Sounds too dramatic" },
];

export function chipLabel(id: string): string {
  return REASON_CHIPS.find((c) => c.id === id)?.label ?? id;
}

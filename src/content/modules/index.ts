// src/content/modules/index.ts
//
// The authored source for all 10 finalized modules.
//
// This is BUILD-TIME content, not runtime content. The app reads modules from
// Supabase (`learning_modules`); these files exist so the content is typed,
// reviewable per-module in a diff, and testable. `npm run seed:modules`
// regenerates supabase/seed_modules.sql from them.
//
// Do not import this from a client component — it would ship ~120KB of
// editorial prose into the browser bundle for no reason.

import type { AuthoredModule } from "@/types/modules";

import { m01 } from "./m01-ewallet-suspension-phishing";
import { m02 } from "./m02-marketplace-bicycle-genuine";
import { m03 } from "./m03-voip-customs-impersonation";
import { m04 } from "./m04-disaster-charity-appeal";
import { m05 } from "./m05-fake-scholarship-portal";
import { m06 } from "./m06-health-cure-forward";
import { m07 } from "./m07-misleading-crime-statistic";
import { m08 } from "./m08-digital-arrest-family-variant";
import { m09 } from "./m09-collect-request-reversal";
import { m10 } from "./m10-trading-circle-investment";

/**
 * Authored order (by module number). The order learners actually see is
 * `sequence_order`, which is different — see SEQUENCED below.
 */
export const ALL_MODULES: AuthoredModule[] = [
  m01, m02, m03, m04, m05, m06, m07, m08, m09, m10,
];

/**
 * Delivery order, from the content spec §10:
 *   01 → 05 → 02 → 03 → 07 → 10 → 04 → 09 → 06 → 08
 *
 * Phishing to warm up. Scholarship while they're pattern-matching. The control
 * to break the pattern. First call while they're alert. The statistic as a hard
 * reset — everything true, still wrong. Trading Circle next, because after the
 * statistic module the learner is primed to distrust presentation, and Trading
 * Circle is the one that survives being tested. Charity and payment for
 * breadth. Health forward for depth. The call about your son last, because
 * it's the one they'll describe to someone else afterwards.
 *
 * Two hard constraints, enforced by public.validate_module_sequence():
 *   - Module 02 (the REAL control) must not be first.
 *   - Modules 03 and 08 must not be adjacent.
 */
export const SEQUENCED: AuthoredModule[] = [...ALL_MODULES].sort(
  (a, b) => a.sequence_order - b.sequence_order
);

/**
 * Minimum viable set for a strong demo: one phishing, the control, one
 * interactive, one action-based. Covers every interaction type and every
 * reasoning skill. Module 10 is the fifth if the demo needs range of scam
 * category rather than range of mechanic.
 */
export const DEMO_SUBSET_SLUGS = [
  "ewallet-suspension-phishing",
  "marketplace-bicycle-genuine",
  "digital-arrest-family-variant",
  "collect-request-reversal",
  "trading-circle-investment",
];

export {
  m01, m02, m03, m04, m05, m06, m07, m08, m09, m10,
};

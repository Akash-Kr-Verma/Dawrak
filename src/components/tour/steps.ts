// src/components/tour/steps.ts
//
// The guided tour, as data.
//
// One entry per coach mark. Nothing here knows how to draw anything — the
// component reads this list, walks to `path`, finds the first selector in
// `targets` that exists, and spotlights it. Keeping the script separate from
// the overlay means the copy can change without touching the positioning code.
//
// `targets` is a list rather than one selector because several of these anchors
// are conditional in the screens they live on: the "Up next" card disappears
// once all ten modules are done, and "Your impact" is hidden entirely on a
// database without the leaderboard migration. The fallback is always an element
// that renders unconditionally on the same screen, so a step never comes up
// empty. If nothing matches, the tooltip simply centres with no spotlight.

export interface TourStep {
  id: string;
  /** Route this step is explained on. The tour navigates there first. */
  path: string;
  /** Candidate anchors, best first. Omit for a step with no spotlight. */
  targets?: string[];
  title: string;
  body: string;
}

/** The route the tour starts and ends on. */
export const TOUR_HOME = "/learn";

/** Present before the tour may auto-start: proof Learn has painted for a real,
 *  signed-in, onboarded account. ProtectedRoute renders a loader otherwise. */
export const TOUR_READY_SELECTOR = '[data-tour="learn-progress"]';

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    path: TOUR_HOME,
    title: "Welcome to Dawrak",
    body: "Learn, teach, and help others become safer online.",
  },
  {
    id: "learn",
    path: "/learn",
    targets: ['[data-tour="learn-next"]', '[data-tour="learn-progress"]'],
    title: "Start by Learning",
    body: "Complete a module and learn to recognize real-world misinformation, scams, and other digital risks through realistic scenarios.",
  },
  {
    id: "share",
    path: "/mentor",
    targets: ['[data-tour="mentor-share"]'],
    title: "Pass It On",
    body: "After completing a module, share it with someone else so they can test what they learned.",
  },
  {
    id: "review",
    path: "/mentor",
    targets: ['[data-tour="mentor-pending"]'],
    title: "Review & Reply",
    body: "Their response appears in Pending Reviews. Review their answer and reply to help them understand what they got right or wrong.",
  },
  {
    id: "impact",
    path: "/profile",
    targets: ['[data-tour="profile-impact"]', '[data-tour="profile-identity"]'],
    title: "See Your Impact",
    body: "Your Profile shows your progress and the people you've reached through Dawrak.",
  },
  {
    id: "challenge",
    path: "/challenge",
    targets: ['[data-tour="challenge-daily"]'],
    title: "Keep Building Your Knowledge",
    body: "Use the Daily Challenge to keep improving your knowledge, and contribute a challenge to help grow the question bank.",
  },
];

/** Steps that carry a "Step n of m" counter — the welcome card is the intro,
 *  not a numbered stop. */
export const NUMBERED_STEPS = TOUR_STEPS.length - 1;

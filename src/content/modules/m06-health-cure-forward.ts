// MODULE 06 — The Health Forward
//
// The hardest module in the set, and it should be. No scammer, no link, no
// money — the person forwarding it loves you and is trying to help.
import type { AuthoredModule } from "@/types/modules";

export const m06: AuthoredModule = {
  slug: "health-cure-forward",
  title: "The Health Forward",
  verdict: "fake",
  difficulty: 5,
  format: "forwarded_message",
  est_seconds: 120,
  tags: ["health_misinformation", "false_authority", "forwarded_content"],

  // Naming the sender as family is deliberate. Every other module has an
  // adversary. This one doesn't, and learners need to feel that difference.
  prompt_text:
    "Your aunt forwards you this in the family group. She's worried about a relative who's unwell.",
  question_variant: null,
  verdict_labels: { positive: "True", negative: "False" },

  render_spec: {
    engine: "screen_sequence",
    frame: "phone",
    screens: [
      {
        id: "family_group",
        kind: "messaging_group",
        props: {
          groupName: "{{FAMILY_GROUP_NAME}}",
          memberCount: 14,
          // Platforms genuinely display this. It is signal S1.
          forwardedManyTimesLabel: true,
          // It's been copy-pasted across a dozen groups and it shows.
          brokenFormatting: true,
          attachedImage: "img_lemons",
          replyCount: 2,
          // No link. No sender to blame. Nothing to click.
          hasLink: false,
        },
      },
    ],
  },

  assets: [
    {
      slot: "img_lemons",
      what: "Lemons, cut, on a surface",
      source: "Unsplash / Pexels — `sliced lemons`",
      license: "Unsplash / Pexels License",
      note: "Degrade it deliberately — downscale to ~400px, re-save as JPEG at quality 40, twice. Real forwards look like this; the artefacting is part of the lesson. Heavily recompressed images have travelled through many hands, which correlates with age and with claims nobody re-checked.",
    },
    {
      slot: "avatars_family",
      what: "3 avatars",
      source: "DiceBear",
      license: "Free",
    },
  ],

  content_blocks: {
    // Use this text as-is. It is a real message that has circulated globally
    // since at least 2011, in dozens of languages. Its exact awkwardness is
    // far more authentic than anything written fresh.
    forwarded_message: `🍋 THE SURPRISING BENEFITS OF LEMON 🍋

Institute of Health Sciences, Baltimore, MD

This is the latest in medicine, effective for cancer!
Read carefully & you be the judge.

Lemon (Citrus) is a miraculous product to kill cancer cells.
It is 10,000 TIMES STRONGER than chemotherapy.

Why do we not know about that?

Because there are laboratories interested in making a
synthetic version that will bring them huge profits. 💰

After more than 20 laboratory tests since 1970, the extracts
revealed that it destroys the malignant cells in 12 cancers,
including colon, breast, prostate, lung and pancreas...

And what is even more astonishing: this therapy destroys ONLY
the malignant cancer cells and it does not affect healthy
cells. Its taste is pleasant and it does not produce the
horrific effects of chemotherapy.

Just cut 2-3 thin slices of lemon in a cup and add water.
Drink it throughout the day.

You can now help a friend in need by letting them know that
lemon juice is beneficial in preventing the disease.

Please forward to everyone you love ❤️`,
    replies: ["Subhanallah, sharing this", "I sent to my sister thank you"],
  },

  signals: [
    {
      id: "S1",
      signal:
        '"Forwarded many times" — nobody in the chain checked; each forward adds trust without adding evidence',
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S2",
      signal:
        'Precise-sounding number with no source. "10,000 times stronger" — stronger measured how, in what, against which drug, at what dose?',
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S3",
      signal:
        "Named institution, no citation. An address is given but no paper, no author, no journal, no date",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S4",
      signal:
        'Suppression narrative — "why don\'t we know about this? Because profits." Converts the absence of evidence into proof of a cover-up, so checking becomes pointless by design',
      weight: 3,
      polarity: "red_flag",
      tier: "expert",
      note: "The immunizing structure. Once 'they're hiding it' is accepted, every debunking becomes further evidence.",
    },
    {
      id: "S5",
      signal:
        '"Cures 12 cancers, harms no healthy cells, tastes nice, no side effects." Real medicine always has trade-offs. A treatment with only upsides is not a treatment',
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S6",
      signal:
        "Instruction to forward — the message's purpose is spreading, not informing",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
    },
    {
      id: "S7",
      signal:
        "Real-thing / false-claim blend. Citrus compounds are genuinely studied for anti-cancer properties; the lie is grafted onto a true stem",
      weight: 2,
      polarity: "red_flag",
      tier: "expert",
      note: "Why 'just google it' fails: the learner searches 'lemon cancer', finds real research on citrus limonoids, and concludes the forward checks out.",
    },
    {
      id: "S8",
      signal: "Image quality shows heavy recirculation",
      weight: 1,
      polarity: "red_flag",
      tier: "expert",
    },
  ],

  canonical_reasoning: `This is false — and the hardest thing about it is that nobody in the chain is lying to you. Your aunt is trying to help. Everyone who forwarded it was trying to help. That's exactly how it travelled this far.

Start with the number. "10,000 times stronger than chemotherapy." Stronger at what? Measured how? Against which drug, at which dose, in a dish or in a person? The number is precise enough to sound like a measurement and vague enough to be unfalsifiable, and that combination is not an accident. It is doing the job of evidence without being evidence.

Then the source. There's an institution and a street address, which feels like a citation — but there's no study, no author, no journal, no date, nothing you could actually look up. And when this message was checked, the organisation it names denied any involvement with it. The name was borrowed to make the claim feel checked, precisely so that you wouldn't check.

Now the most important sentence in the whole thing: *"Why do we not know about that? Because there are laboratories interested in profits."* Look at what that does. It takes the absence of evidence — the very thing that should make you doubt — and reframes it as proof of a cover-up. Once you accept it, no fact can ever reach you again, because every expert who disagrees becomes part of the conspiracy. That single move is what makes health misinformation so much more durable than a scam link. It doesn't just make a false claim; it disables your ability to check it.

And look at what's being promised: cures twelve cancers, harms no healthy cells, tastes pleasant, no side effects. Real medicine always costs something. Chemotherapy is brutal *because* it's potent, and oncologists spend their careers managing that trade-off. A treatment with only benefits and no costs is not a miracle — it's a sign that nobody has actually tested it in a person.

Here's the part that makes this worth learning properly. Lemons are not nonsense. Citrus fruits contain compounds that researchers genuinely study for anti-cancer properties, with some promising early results. The lie is grafted onto that true stem — which is why a quick search seems to confirm it. The real question is never "is there anything to this?" It's **"does the evidence support the specific claim being made?"** Some early lab research on citrus compounds does not support "cures twelve cancers, 10,000 times stronger than chemotherapy."

And the harm here isn't your money. It's that someone reads this, feels hopeful, and delays real treatment for a disease where weeks matter. That's why forwarding it "just in case" is not harmless.

What to do instead: don't forward it. And if someone you love is unwell, the most caring thing you can send is not a remedy — it's a question you both take to their doctor.`,

  rubric: {
    accept: [
      { anyOf: ["S2", "S3", "S4", "S5"], min: 1 },
      { anyOf: ["S1", "S6", "S7"], min: 2 },
    ],
    partial: [
      {
        anyOf: ["S1", "S6", "S7", "S8"],
        min: 1,
        andNot: ["S2", "S3", "S4", "S5"],
      },
    ],
    bonusAdvanced: ["S4", "S7"],
    feedbackConstraints: [
      "MANDATORY: Never state or imply the learner's relative should stop or change any treatment. Feedback discusses the message, never anyone's medical situation. If the learner's reasoning discloses that someone close to them is actually ill, acknowledge it warmly in one line and then stay entirely on the media-literacy point.",
      "MANDATORY: Never disparage the family member who forwarded it. The lesson is 'checking claims is compatible with loving people', not 'your aunt is gullible'.",
    ],
  },

  distractors: [
    {
      claim: "Lemons don't do anything for cancer",
      correction:
        "Overcorrection. Citrus compounds are genuinely researched. Credit the verdict, correct the reasoning — a learner who learns 'natural = always nonsense' has swapped one bad heuristic for another.",
    },
    {
      claim: "It's from an old email so it's outdated",
      correction: "It's false, not outdated.",
    },
    {
      claim: "There's no link so it's safe to share",
      correction: "The absence of a link is what makes it feel safe. That's the trap.",
    },
    {
      claim: "My family wouldn't send me something fake",
      correction:
        "The exact instinct being tested. Handle gently; this is the real answer many learners hold.",
    },
  ],

  reveal: {
    headline: "This exact message has been circulating since at least 2011.",
    body: "A widely circulating message claiming to come from the Institute of Health Sciences in Baltimore states that lemons are a proven remedy against cancers of all types and are 10,000 times stronger than chemotherapy. The claims are not correct. The named institute's response was that the email did not come from them, that whoever started it used some of their published material — which had nothing to do with lemons — and inserted the lemon information, and that it caused them a great deal of trouble. While lemons and citrus fruits do contain naturally occurring compounds such as modified citrus pectin and limonoids, and a few studies of their anti-carcinogenic properties have found promising results, not enough research has been done to prove effects in humans.\n\nThis is not a fringe problem: a 2022 study of the most popular social media articles on the four most common cancers found that one in every three contained false, inaccurate, or misleading information, and a 2017 study found that cancer patients who chose alternative therapies over conventional treatment faced a higher risk of death.",
    sourceLinks: [
      "https://www.snopes.com/fact-check/lemon-cancer-cure/",
      "https://center4research.org",
      "https://www.cancer.gov",
    ],
  },

  call_script: null,
  content_warning: false,
  content_warning_text: null,
  skippable_without_penalty: false,
  sequence_order: 9,
};

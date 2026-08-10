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
  // Was True/False. Every module in the set now asks the same question with the
  // same two buttons — a learner shouldn't have to work out what they're being
  // asked before they can answer it. "Fake" reads slightly oddly against a
  // health claim, and that is the smaller cost by a distance.
  verdict_labels: { positive: "Real", negative: "Fake" },

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
      short:
        "“Forwarded many times.” Nobody in that chain checked anything — each forward adds trust without adding a single piece of evidence.",
      cues: [
        "forwarded many times",
        "forwarded",
        "chain",
        "passed around",
        "nobody checked",
        "no one verified",
        "just shared",
        "keeps getting sent",
      ],
    },
    {
      id: "S2",
      signal:
        'Precise-sounding number with no source. "10,000 times stronger" — stronger measured how, in what, against which drug, at what dose?',
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      short:
        "“10,000 times stronger.” Stronger at what, measured how, against which drug, at what dose? Precise enough to sound measured, vague enough to be uncheckable.",
      cues: [
        "10000",
        "10 000",
        "ten thousand",
        "times stronger",
        "the number",
        "specific number",
        "stronger than chemo",
        "where does that number",
        "no source for the number",
        "made to sound",
      ],
    },
    {
      id: "S3",
      signal:
        "Named institution, no citation. An address is given but no paper, no author, no journal, no date",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      short:
        "An institution and a street address, but no study, no author, no journal, no date. A name borrowed to make the claim feel checked, so you wouldn't check it.",
      cues: [
        "no source",
        "no study",
        "no citation",
        "no reference",
        "no author",
        "no journal",
        "cant look it up",
        "institute",
        "institution",
        "no link to the research",
        "no paper",
      ],
    },
    {
      id: "S4",
      signal:
        'Suppression narrative — "why don\'t we know about this? Because profits." Converts the absence of evidence into proof of a cover-up, so checking becomes pointless by design',
      weight: 3,
      polarity: "red_flag",
      tier: "expert",
      note: "The immunizing structure. Once 'they're hiding it' is accepted, every debunking becomes further evidence.",
      short:
        "“Why don't we know about this? Profits.” That move turns the absence of evidence into proof of a cover-up — and once you accept it, no fact can ever reach you again.",
      cues: [
        "cover up",
        "conspiracy",
        "hiding it",
        "suppress",
        "big pharma",
        "profits",
        "companies dont want",
        "they dont want you to know",
        "cant be disproved",
        "unfalsifiable",
      ],
    },
    {
      id: "S5",
      signal:
        '"Cures 12 cancers, harms no healthy cells, tastes nice, no side effects." Real medicine always has trade-offs. A treatment with only upsides is not a treatment',
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      short:
        "Cures twelve cancers, harms no healthy cells, tastes pleasant, no side effects. Real medicine always costs something — a treatment with only upsides hasn't been tested in anyone.",
      cues: [
        "no side effects",
        "only good",
        "too good to be true",
        "cures everything",
        "twelve cancers",
        "12 cancers",
        "no downside",
        "miracle",
        "real medicine",
        "trade off",
        "doesnt harm healthy",
      ],
    },
    {
      id: "S6",
      signal:
        "Instruction to forward — the message's purpose is spreading, not informing",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
      short:
        "It tells you to forward it to everyone you love. The message's purpose is spreading, not informing.",
      cues: [
        "forward to everyone",
        "asks you to share",
        "tells you to share",
        "please forward",
        "share it",
        "spread",
        "purpose is to spread",
      ],
    },
    {
      id: "S7",
      signal:
        "Real-thing / false-claim blend. Citrus compounds are genuinely studied for anti-cancer properties; the lie is grafted onto a true stem",
      weight: 2,
      polarity: "red_flag",
      tier: "expert",
      note: "Why 'just google it' fails: the learner searches 'lemon cancer', finds real research on citrus limonoids, and concludes the forward checks out.",
      short:
        "There is real research on citrus compounds — the false claim is grafted onto a true stem, which is why a quick search seems to confirm it.",
      cues: [
        "some truth",
        "partly true",
        "based on something real",
        "real research",
        "mixed with",
        "grain of truth",
        "exaggerated",
        "twisted",
        "citrus",
        "doesnt support the claim",
      ],
    },
    {
      id: "S8",
      signal: "Image quality shows heavy recirculation",
      weight: 1,
      polarity: "red_flag",
      tier: "expert",
      short:
        "The image is degraded from being saved and re-sent over and over — a picture of how far it has travelled.",
      cues: [
        "image quality",
        "blurry",
        "pixelated",
        "low quality",
        "compressed",
        "screenshot of a screenshot",
      ],
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
    feedback: {
      strongest:
        "“Why do we not know about that? Because there are laboratories interested in profits.” That one sentence takes the absence of evidence — the very thing that should make you doubt — and turns it into proof of a cover-up. Accept it and no fact can reach you afterwards, because anyone who disagrees becomes part of the conspiracy. It doesn't just make a false claim; it disables your ability to check it.",
      takeaway:
        "The question is never “is there anything to this?” — it's “does the evidence support the specific claim being made?” And if someone you love is unwell, the most caring thing to send isn't a remedy, it's a question you both take to their doctor.",
      wrongVerdictNote:
        "This one is genuinely hard, and not because of anything you missed: there's no scammer here, no link and no money. Your aunt is trying to help, everyone who forwarded it was trying to help, and that is exactly how it travelled this far.",
    },
  },

  distractors: [
    {
      claim: "Lemons don't do anything for cancer",
      correction:
        "That's an overcorrection worth catching. Citrus compounds are genuinely researched, with some promising early results — the message is false because of the specific claims it makes, not because natural things are always nonsense.",
      cues: [
        "lemons dont",
        "lemon cant",
        "natural remedies dont",
        "nothing to do with",
        "no fruit can",
        "obviously nonsense",
      ],
    },
    {
      claim: "It's from an old email so it's outdated",
      correction:
        "It's not outdated — it's false, and it was false when it was written. Age isn't the problem; the claims were never supported.",
      cues: ["outdated", "old email", "out of date", "old message", "from years ago"],
    },
    {
      claim: "There's no link so it's safe to share",
      correction:
        "The absence of a link is exactly what makes it feel harmless, and it's the trap. The harm here isn't money — it's someone reading it, feeling hopeful, and delaying real treatment.",
      cues: [
        "no link",
        "safe to share",
        "no harm in sharing",
        "doesnt ask for money",
        "no money involved",
        "harmless",
      ],
    },
    {
      claim: "My family wouldn't send me something fake",
      correction:
        "She wouldn't, knowingly — and that's the point. Everyone in the chain forwarded it out of care. Checking a claim and trusting the person who sent it are not in conflict.",
      cues: [
        "my aunt wouldnt",
        "family wouldnt",
        "she wouldnt send",
        "i trust her",
        "wouldnt lie to me",
      ],
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

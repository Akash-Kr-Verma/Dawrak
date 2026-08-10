// MODULE 05 — Scholarship Acceptance
//
// Aimed straight at the app's demographic. Core lesson: only apply, and only
// check results, through the official site.
import type { AuthoredModule } from "@/types/modules";

export const m05: AuthoredModule = {
  slug: "fake-scholarship-portal",
  title: "Scholarship Acceptance",
  verdict: "fake",
  difficulty: 3,
  format: "dm_plus_portal",
  est_seconds: 120,
  tags: ["scholarship_fraud", "youth_targeted", "official_channels"],

  // Two months + "a group you joined" is essential context. These scams are
  // timed to the week real results are announced.
  prompt_text:
    "You applied for a scholarship two months ago. This message arrives from a group you joined while researching it.",
  question_variant: null,
  verdict_labels: { positive: "Real", negative: "Fake" },

  render_spec: {
    engine: "screen_sequence",
    frame: "phone",
    safety: [
      "Same build-safety rule as Module 01: rendered component, static address bar, no live form, no real POST.",
      "Use a fictional program name in the module itself. The real program (e.g. Türkiye Bursları) appears in the reveal panel only, never as the impersonated brand.",
    ],
    screens: [
      {
        id: "group_dm",
        kind: "messaging_group",
        advance: { via: "link_tap", label: "{{FAKE_PORTAL_URL}}" },
        props: {
          groupName: "{{PROGRAM_NAME}} Scholars {{YEAR}} — Official Group",
          // Big enough to feel institutional.
          memberCount: "1,247 members",
          adminBadge: "Admin",
          hasForwardedPdfThumb: true,
          replyCount: 5,
        },
      },
      {
        id: "portal",
        kind: "institutional_portal",
        props: {
          crest: true,
          serifHeader: true,
          palette: "blue_white",
          breadcrumbNav: true,
          // .org, not the real .gov.xx domain.
          addressBar: "{{PROGRAM}}-scholarships.org/results",
          addressBarStatic: true,
          feeBlock: true,
          uploadBlock: ["Passport (scan)", "National ID (both sides)", "Bank account details"],
          beneficiaryIsPersonalName: true,
        },
      },
    ],
  },

  assets: [
    {
      slot: "crest_program",
      what: "Fictional institutional crest — laurel/shield/star, formal serif wordmark",
      source: "Make it yourself",
      license: "Ours",
      note: "Make it good. These scams use convincing crests.",
    },
    {
      slot: "pdf_thumb",
      what: "Acceptance-letter preview",
      source: "Design a one-page letter, screenshot at low res",
      license: "Ours",
      note: "Deliberately slightly blurry.",
    },
    {
      slot: "avatar_admin",
      what: "Graduation-cap avatar",
      source: "Generated avatar (safer than a stock portrait)",
      license: "Free",
    },
    {
      slot: "avatars_members",
      what: "5–6 small avatars",
      source: "DiceBear",
      license: "Free",
    },
  ],

  content_blocks: {
    admin_message: `📢 RESULTS ARE OUT — {{YEAR}} INTAKE

Congratulations to everyone selected! 🎉 Check your status
on the results portal below.

⚠️ IMPORTANT: Selected candidates must confirm their place
within 72 hours or the seat is released to the waiting list.

Results portal 👉 {{FAKE_PORTAL_URL}}

Any problems with the confirmation step, message me directly
and I'll help you personally. Don't ask in the group, we get
too many messages.`,
    // That last line is the isolation move — it separates the target from the
    // only people who could tell them it's a scam. It's also observable,
    // which makes it teachable.
    group_replies: [
      "Alhamdulillah I got in!! 🎉🎉",
      "Congratulations everyone 👏",
      "Just paid the confirmation, was easy",
      "Bro is the fee refundable?",
      "Thank you so much for your help 🙏",
    ],
    admin_reply_to_fee_question: "Yes, refunded with your first stipend 👍",
    portal_headline:
      "Congratulations, {{LEARNER_NAME}}! You have been selected for the {{PROGRAM_NAME}} {{YEAR}} intake.",
    portal_award: "Award: Full tuition + monthly stipend + return flight",
    portal_fee:
      "⚠️ Confirmation & Document Processing Fee: {{SMALL_AMOUNT}} — payable within 72 hours",
    portal_beneficiary:
      "Beneficiary: {{PERSON_NAME}} · Bank: {{BANK}} · Ref: {{CASE_NUMBER}}",
    portal_uploads: ["Passport (scan)", "National ID (both sides)", "Bank account details"],
  },

  signals: [
    {
      id: "S1",
      signal:
        "A fee to accept an award. A scholarship gives money; charging you inverts the entire relationship",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      note: "Sufficient on its own for full credit. It's the correct rule and it's complete.",
      short:
        "You're asked to pay a fee to receive a scholarship. Money is supposed to flow to you — the moment it flows the other way, the relationship has been inverted.",
      cues: [
        "fee",
        "pay to",
        "paying to",
        "asked to pay",
        "asked for money",
        "asked for payment",
        "charge",
        "charging",
        "processing fee",
        "confirmation fee",
        "pay to receive",
        "pay for a scholarship",
        "never pay",
        "shouldnt have to pay",
        "should not pay",
        "money to accept",
        "payment to confirm",
      ],
    },
    {
      id: "S2",
      signal:
        "Results announced anywhere but the official site — no institution or person is authorized to apply or confirm on a candidate's behalf",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      short:
        "The results arrived in a group chat and a forwarded link, not on the programme's own site. Someone telling you about results is not results.",
      cues: [
        "official site",
        "official website",
        "official portal",
        "official channel",
        "not on the website",
        "check the website",
        "check the official",
        "from a group",
        "group chat",
        "whatsapp group",
        "should be on the site",
        "should come from",
        "directly from the university",
        "where i applied",
        "the portal i applied",
      ],
    },
    {
      id: "S3",
      signal: "Wrong domain — .org lookalike, not the program's real official domain",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      short:
        "The address is a .org lookalike, not the programme's real official domain. The look of a portal is free to copy; the domain is the one thing that isn't.",
      cues: [
        "domain",
        "dot org",
        "url",
        "web address",
        "site address",
        "link is",
        "wrong website",
        "wrong site",
        "lookalike",
        "not the real site",
        "address bar",
        "the link",
      ],
    },
    {
      id: "S4",
      signal: "Payment to a personal name, not an institution",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      short:
        "The money goes to a person's name and a personal bank account, not to the institution supposedly awarding it.",
      cues: [
        "personal name",
        "persons name",
        "a person not",
        "individual",
        "private account",
        "personal account",
        "someones bank",
        "not the institution",
        "not a university",
        "beneficiary",
        "who the money goes to",
      ],
    },
    {
      id: "S5",
      signal: "72-hour deadline on a life-changing decision",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
      short:
        "A 72-hour deadline on the biggest academic decision of your life. Urgency is not administration — it exists to stop you checking.",
      cues: [
        "72 hours",
        "deadline",
        "hurry",
        "rush",
        "rushing",
        "urgency",
        "urgent",
        "pressure",
        "time limit",
        "act fast",
        "so quickly",
        "only three days",
      ],
    },
    {
      id: "S6",
      signal:
        '"Message me privately, not in the group" — isolating the target from anyone who might warn them',
      weight: 3,
      polarity: "red_flag",
      tier: "expert",
      short:
        "“Message me directly, don't ask in the group.” That single line moves you away from the only people who could say “wait, I didn't pay anything.”",
      cues: [
        "privately",
        "private message",
        "in private",
        "dm me",
        "message me directly",
        "not in the group",
        "dont ask in the group",
        "do not ask in the group",
        "away from",
        "isolate",
        "isolating",
        "keep it quiet",
        "one to one",
      ],
    },
    {
      id: "S7",
      signal:
        "Documents that are identity, not eligibility — passport, ID both sides, bank details. Harvested for identity theft and resale",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
      short:
        "Passport, ID both sides, bank details. That's identity, not eligibility — none of it proves you qualify for anything.",
      cues: [
        "passport",
        "national id",
        "id card",
        "both sides",
        "bank details",
        "bank account details",
        "documents",
        "identity",
        "personal information",
        "personal data",
        "scan of my",
        "upload",
      ],
    },
    {
      id: "S8",
      signal:
        "Testimonials inside the same channel the scam controls — the admin can post anything",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
      short:
        "The congratulations are inside the channel the scammer runs. Whoever controls the group controls who appears to have been paid.",
      cues: [
        "testimonial",
        "comments in the group",
        "people in the group",
        "others confirmed",
        "replies",
        "admin controls",
        "admin can post",
        "same group",
        "fake comments",
        "anyone can write",
      ],
    },
    {
      id: "S9",
      signal:
        '"Refunded with your first stipend" — an unverifiable promise about a future that won\'t arrive',
      weight: 1,
      polarity: "red_flag",
      tier: "expert",
      short:
        "“Refunded with your first stipend” — a promise about a future that isn't coming, and one you can't check now.",
      cues: [
        "refund",
        "refunded",
        "get it back",
        "get the money back",
        "stipend",
        "empty promise",
        "cant verify the promise",
      ],
    },
  ],

  canonical_reasoning: `This is fake, and the single fact that settles it is this: **you were asked to pay to receive a scholarship.**

A scholarship is money given to you. The moment money flows the other way — a confirmation fee, a processing fee, a seat-reservation fee — the relationship has been inverted, and that inversion is the scam. There is no legitimate program anywhere that charges you to accept an award it already decided to give you.

The second fact is where the news arrived. Real results are published on the program's official site, and nowhere else. A group chat, a forwarded PDF, a message from an "admin" — none of these are results. They're just someone telling you about results. The domain here is \`.org\`, not the program's actual official address, which for a government scholarship almost always ends in a country's official government domain. The look of a portal costs nothing to copy; the domain is the only thing that can't be.

Then notice the deadline. Seventy-two hours, on the biggest academic decision of your life, timed to arrive in the exact week you were already refreshing your inbox for real news. Urgency is not administration. It's a tool for stopping you from checking.

And look at that one line: *"message me directly, don't ask in the group."* That is the most deliberate sentence in the whole message. It moves you somewhere private, away from the only people who might say "wait, I didn't pay anything." Anyone who wants to separate you from people who can check their story is telling you what they are.

The rule that protects you every time, forever: **check on the official site yourself.** Not the link, not the group, not the PDF. Type the address you already know, log into the portal you originally applied through, and see what it says. If you were really selected, it will be there. If it isn't there, it didn't happen.`,

  rubric: {
    accept: [
      { anyOf: ["S1", "S2"], min: 1 },
      { anyOf: ["S3", "S4", "S6", "S7"], min: 2 },
    ],
    partial: [
      { anyOf: ["S3", "S4", "S5", "S6", "S7"], min: 1, andNot: ["S1", "S2"] },
    ],
    bonusAdvanced: ["S6"],
    sufficientAlone: ["S1"],
    feedbackConstraints: [
      'Treat S1 as sufficient on its own. If a learner writes only "you never pay for a scholarship", that is full credit — the rule is correct and complete.',
    ],
    feedback: {
      strongest:
        "You were asked to pay a fee to receive a scholarship. That one fact settles it, on its own, with nothing else needed. A scholarship is money given to you — the moment money is required to travel the other way, whether it's called a confirmation fee, a processing fee or a seat deposit, the relationship has been inverted. No legitimate programme charges you to accept an award it has already decided to give you.",
      takeaway:
        "Check on the official site you already know — not the link, not the group, not the PDF, not the person who messaged you. If you were really selected, it will be there. If it isn't there, it didn't happen.",
      wrongVerdictNote:
        "This one is built to be believed. It lands in the exact week real results come out, in a group you genuinely joined, about a scholarship you genuinely applied for. That timing is the design, not something you missed.",
    },
  },

  distractors: [
    {
      claim: "The fee is too small to be a scam",
      correction:
        "The small amount is the design, not a reason to relax. These operations take thousands of applications at a price low enough that nobody argues — it works because arguing feels like more trouble than paying.",
      cues: [
        "small amount",
        "only 45",
        "not much money",
        "small fee",
        "cheap",
        "too small to be",
        "its only a little",
      ],
    },
    {
      claim: "Other people in the group confirmed it",
      correction:
        "The people confirming it are inside the group the scammer runs. Whoever controls the channel controls who appears to have been paid.",
      cues: [
        "others confirmed",
        "other people said",
        "people in the group said",
        "everyone else",
        "others got it",
        "someone else paid",
      ],
    },
    {
      claim: "The portal looked professional",
      correction:
        "A convincing portal is the cheapest part of this to build. Layout, crest and serif type cost nothing; the domain is the part that can't be copied.",
      cues: [
        "looked professional",
        "looks professional",
        "looked real",
        "looks official",
        "well designed",
        "good design",
        "proper website",
      ],
    },
    {
      claim: "I never applied so it's obviously fake",
      correction:
        "You did apply — that's in the scenario, and it's exactly what makes this version work. The version that catches people is the one that arrives when they're already waiting for news.",
      cues: [
        "never applied",
        "didnt apply",
        "did not apply",
        "i never entered",
        "i didnt sign up",
      ],
    },
  ],

  reveal: {
    headline:
      "This runs against every major scholarship program, every results season.",
    body: 'Scammers copy real logos and program names — Chevening, Fulbright, MEXT, Erasmus Mundus — and time their messages to land in the exact week genuine results come out. The pattern: a group appears weeks before results with a name like "[Program] Scholars Official Group," an "admin" posts an acceptance-letter screenshot, new members get pushed into private chat instead of helped in the open group, and anyone who asks whether it\'s been verified on the official website gets ignored or removed. Education ministries publish warnings about this constantly — one national higher-education commission warned that fake accounts bearing its name and logo were promoting application and registration links for its scholarships.',
    localizationNote:
      "MENA pack: Türkiye Bursları is the highest-relevance real program — hundreds of thousands of applicants a year across the Arab world. Official domain: turkiyeburslari.gov.tr. Official guidance states there are no institutions or persons authorized to apply on a candidate's behalf. Use the real program name ONLY in the reveal panel, never as the impersonated brand in the module itself.",
  },

  call_script: null,
  content_warning: false,
  content_warning_text: null,
  skippable_without_penalty: false,
  sequence_order: 2,
};

// MODULE 04 — Emergency Appeal (Fake Charity)
import type { AuthoredModule } from "@/types/modules";

export const m04: AuthoredModule = {
  slug: "disaster-charity-appeal",
  title: "Emergency Appeal",
  verdict: "fake",
  difficulty: 4,
  format: "social_post_plus_donation_page",
  est_seconds: 120,
  tags: ["charity_fraud", "emotional_manipulation", "crypto"],

  // "Several people you follow have shared it" matters: sharing is the
  // mechanism by which these spread, and the thing that makes them feel vetted.
  prompt_text:
    "This appeared in your feed. Several people you follow have shared it. Real or fake — and how do you know?",
  question_variant: null,
  verdict_labels: { positive: "Real", negative: "Fake" },

  render_spec: {
    engine: "screen_sequence",
    frame: "phone",
    safety: [
      "Do not use photographs of identifiable disaster victims, and especially not children. Those people did not consent to appearing in a fabricated scam, and using them reproduces the exploitation the module condemns.",
      "The donation page is a rendered component. No live payment fields, no outbound POST.",
    ],
    screens: [
      {
        id: "post",
        kind: "social_feed_card",
        advance: { via: "cta_tap", label: "Donate" },
        props: {
          // A ✅ typed into the page name, not a real platform badge.
          fakeVerificationInName: true,
          sponsoredLabel: "Sponsored",
          // Shares far outnumbering comments is a real pattern in
          // coordinated amplification.
          reactions: "2.1K",
          shares: "847",
          commentCount: 3,
          commentAvatars: "default",
        },
      },
      {
        id: "donation",
        kind: "donation_page",
        props: {
          // Near-complete goals manufacture "join the crowd" pressure.
          progressRaised: 47283,
          progressGoal: 50000,
          paymentOptions: ["Bitcoin", "USDT (TRC-20)", "Bank Transfer", "Gift Cards"],
          hasCardPayment: false,
          hasRecognizedPlatform: false,
          footerHasRegistrationNumber: false,
          footerHasAddress: false,
          footerHasNamedStaff: false,
          // A quiet inconsistency for advanced learners.
          copyrightYear: "{{LAST_YEAR}}",
        },
      },
    ],
  },

  assets: [
    {
      slot: "hero_image",
      what: "Disaster-affected setting — wide shots with NO identifiable faces",
      source:
        "Wikimedia Commons / Unsplash / Pexels — `flood damaged street`, `emergency shelter tents`",
      license: "CC BY / CC0 — check each Commons file's page, licenses vary per file",
      note: "The appeal works fine without a face; emotional manipulation in real fake charities is carried by the text far more than the image.",
    },
    {
      slot: "logo_charity",
      what: "Fictional charity mark — globe/hands/heart lettermark",
      source: "Make it yourself",
      license: "Ours",
      note: "Must look competent. Bad design is not the tell.",
    },
    {
      slot: "avatars_comments",
      what: "3 commenter avatars",
      source: "DiceBear / default silhouettes",
      license: "Free",
      note: "Default avatars are part of the signal.",
    },
    {
      slot: "qr_donate",
      what: "QR on the donation page",
      source: "Generate one pointing at a safe in-app route",
      license: "Ours",
      note: "The FBI specifically flags QR-code-linked donation sites.",
    },
  ],

  content_blocks: {
    page_name: "{{CHARITY_NAME}} Relief Fund ✅",
    post_text: `🚨 URGENT — Families in {{REGION}} have lost everything.

Children are sleeping outside tonight. We are on the ground
NOW delivering food, clean water and medical supplies. 100%
of your donation goes directly to families in need.

⏰ EVERY DONATION MATCHED — but only for the next 48 hours.

Don't scroll past. Give what you can. Share this post. 🙏`,
    comments: [
      { text: "May God bless you 🙏🙏", avatar: "default" },
      { text: "Donated! Everyone please help", avatar: "default" },
      { text: "Sharing 💔", avatar: "default" },
    ],
    donation_headline: "Every Minute Counts. Give Now.",
    progress: "$47,283 raised of $50,000 goal",
    payment_options: ["Bitcoin", "USDT (TRC-20)", "Bank Transfer", "Gift Cards"],
    footer: "contact: {{CHARITY_NAME}}relief@gmail.com · © {{LAST_YEAR}}",
  },

  signals: [
    {
      id: "S1",
      signal:
        "Irreversible, untraceable payment only — crypto, transfer, gift cards; no card, no recognized platform",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S2",
      signal:
        "No registration number, address, or named people — every legitimate charity is registered somewhere and says so",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S3",
      signal:
        '"100% goes directly to families" — impossible. Every real charity has overheads and publishes them. Claiming zero is a claim of magic',
      weight: 3,
      polarity: "red_flag",
      tier: "expert",
      note: "The sharpest signal in this module and the one nobody teaches. It sounds like the most reassuring sentence in the post. It's the biggest lie in it.",
    },
    {
      id: "S4",
      signal: "Manufactured deadline on a matched-donation offer",
      weight: 2,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S5",
      signal:
        "New page, timed to a current disaster — avoid charities that seem to have sprung up overnight around current events",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
    },
    {
      id: "S6",
      signal:
        "Fake verification — a ✅ typed into the page name, not a platform badge",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
    },
    {
      id: "S7",
      signal:
        "Shares ≫ comments, generic comments from default avatars",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
    },
    {
      id: "S8",
      signal: "Free email provider as the only contact",
      weight: 1,
      polarity: "red_flag",
      tier: "expert",
    },
    {
      id: "S9",
      signal: "Copyright year is stale — page built from a template",
      weight: 1,
      polarity: "red_flag",
      tier: "expert",
    },
  ],

  canonical_reasoning: `This is fake, and it's built to be hardest to question at exactly the moment you're most likely to give.

The clearest evidence is how it wants to be paid. Cryptocurrency, bank transfer, gift cards — every option is irreversible and untraceable. Real charities take cards and use recognized donation platforms, because they need to issue receipts, satisfy auditors, and refund mistakes. A donation you cannot trace and cannot reverse is not a donation. It's a transfer to a stranger.

Then check who they are. There is no registration number, no address, no named person, no published accounts — just a free email address and a logo. Every legitimate charity is registered with someone and will tell you exactly who, because that registration is the thing that lets them ask you for money in the first place.

Now the line that should stop you: "100% of your donation goes directly to families in need." That is not a generous promise, it's an impossible one. Getting food to a flooded region costs money — trucks, staff, storage, coordination. Real charities publish those costs because they're a sign the work is actually happening. An organization claiming zero overhead is either lying about the money or not doing the work.

Everything else stacks on top: a 48-hour deadline, a page that appeared with the disaster, a checkmark typed into the name to imitate a verification badge, hundreds of shares and almost no real comments.

None of this means you shouldn't give. It means give *through the front door* — go to an organization you already know, type their address yourself, and donate there. The impulse to help is the right one. The link is the problem.`,

  rubric: {
    accept: [
      { anyOf: ["S1", "S2"], min: 1 },
      { anyOf: ["S3", "S4", "S5", "S6", "S7"], min: 2 },
    ],
    partial: [
      {
        anyOf: ["S3", "S4", "S5", "S6", "S7", "S8", "S9"],
        min: 1,
        andNot: ["S1", "S2"],
      },
    ],
    bonusAdvanced: ["S3"],
    feedbackConstraints: [
      "TONE REQUIREMENT — enforce strictly. A learner who says 'I would have donated' must never be made to feel stupid. Generosity is the vulnerability being exploited here, and shaming it teaches cynicism instead of discernment.",
      "Feedback closes on HOW TO GIVE SAFELY, never on how nearly they were fooled.",
    ],
  },

  distractors: [
    {
      claim: "The photo looks stock/fake",
      correction:
        "It's a real photo of a real event, as these appeals usually use. Not the tell.",
    },
    {
      claim: "Real charities don't use emotional language",
      correction:
        "They absolutely do, and legitimately. Emotion isn't evidence of fraud.",
    },
    {
      claim: "It's asking for money, so it's a scam",
      correction: "Over-flagging. Would also reject every real appeal.",
    },
    {
      claim: "No verification badge",
      correction:
        "There is a (fake) one. Reading it as absent means missing the actual trick.",
    },
  ],

  reveal: {
    headline: "This pattern is documented and it runs after every disaster.",
    body: "The FBI describes charity fraud as schemes soliciting donations for organizations that do little or no work, and notes they're especially prevalent after high-profile disasters, with criminals using tragedies to exploit people who want to help. Scammers pivot to charity fraud whenever a catastrophic event occurs — war, natural disaster, epidemic. In one documented case, criminals targeted 212 people across 88 organizations soliciting crypto donations between $100 and $5,000, and included links to genuine news articles to build credibility.",
    sourceLinks: [
      "https://www.fbi.gov/how-we-can-help-you/scams-and-safety/common-frauds-and-scams/charity-and-disaster-fraud",
      "https://consumer.ftc.gov/all-scams/charity-scams",
    ],
  },

  call_script: null,
  content_warning: false,
  content_warning_text: null,
  skippable_without_penalty: false,
  sequence_order: 7,
};

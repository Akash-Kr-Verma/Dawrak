// MODULE 10 — The Trading Circle (Investment Fraud)
//
// The one module designed to survive the learner testing it. S4 and S5 are the
// two signals that actually protect people, and they're absent from almost all
// scam-awareness material.
import type { AuthoredModule } from "@/types/modules";

export const m10: AuthoredModule = {
  slug: "trading-circle-investment",
  title: "The Trading Circle",
  verdict: "fake",
  difficulty: 3,
  format: "group_chat",
  est_seconds: 120,
  tags: ["investment_fraud", "social_proof", "guaranteed_returns"],

  // "A few days" matters. Nobody joins one of these and deposits in the first
  // minute — the group is designed to be watched until it feels normal.
  prompt_text:
    "Someone added you to this group. You've been reading it for a few days.",
  question_variant: null,
  verdict_labels: { positive: "Real", negative: "Fake" },

  render_spec: {
    engine: "screen_sequence",
    frame: "phone",
    safety: [
      "Do not use a real broker's or exchange's dashboard, even blurred.",
    ],
    screens: [
      {
        id: "group",
        kind: "group_chat",
        props: {
          header: "Trading Circle — VIP Members",
          participants: "43 participants",
          // Pinning makes the offer read as the group's official position.
          pinnedBanner: true,
          // A "community" where only one person may speak is not a community.
          composerDisabled: true,
          composerLabel: "Only admins can send messages",
          // Several messages at 03:12, 03:14, 04:47. Signal S7.
          oddTimestampCluster: ["03:12", "03:14", "04:47"],
          payoutScreenshots: 3,
          highlightLatest: true,
        },
      },
    ],
  },

  assets: [
    {
      slot: "screenshot_payout",
      what: "Fake trading dashboard showing profits (×3)",
      source: "Build as SVG/HTML in-app, then screenshot-degrade",
      license: "Ours",
      note: "Green numbers, a rising line, a balance figure. Vary the amounts so they don't look duplicated.",
    },
    {
      slot: "avatars_members",
      what: "Member avatars (×6)",
      source: "DiceBear",
      license: "Free",
    },
    {
      slot: "avatar_admin",
      what: "Admin avatar — a suit-and-tie illustrated avatar, not a photo",
      source: "Generated",
      license: "Free",
    },
  ],

  content_blocks: {
    pinned_message: `📌 PINNED — {{ADMIN_NAME}} (Admin)

WELCOME TO TRADING CIRCLE VIP 📈

Our FX bot has run 41 weeks with ZERO losing weeks.
Deposit {{SMALL_AMOUNT}} today → {{TEN_X_AMOUNT}} in 7 days.
GUARANTEED. Capital fully protected.

New members start small. Withdraw your first profit in
week 1 so you can see for yourself. 💯

Serious members only. DM me to be onboarded.`,
    thread: [
      {
        kind: "image_plus_text",
        image: "screenshot_payout",
        text: "Withdrew my first {{AMOUNT}} today, straight to my bank 🙏🙏",
      },
      { kind: "text", text: "Sir you changed my life, may God reward you" },
      { kind: "image_plus_text", image: "screenshot_payout", text: "Week 3 🚀🚀🚀" },
      {
        kind: "text",
        text: "guys is this actually safe? asking seriously",
        // Never deleted — the group NEEDS visible scepticism to look real.
        adminReply:
          "Great question brother, and you SHOULD ask. That's why we let every new member withdraw in week 1. Don't take my word — take your own money out and see. 🙏",
      },
      { kind: "image_plus_text", image: "screenshot_payout", text: "up again", time: "03:12" },
      { kind: "text", text: "🔥🔥", time: "04:47" },
    ],
    latest_highlighted:
      "⏰ ONLY 6 SPOTS LEFT THIS ROUND — deposit before midnight or wait for next cycle",
    composer: "Only admins can send messages",
  },

  signals: [
    {
      id: "S1",
      signal:
        "Guaranteed returns. The single biggest red flag in any investment offer anywhere. Return and risk are the same thing — an investment with no downside is not an investment",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      note: "Sufficient alone for full credit. A learner who holds only this is well defended.",
      short:
        "Guaranteed returns. Risk and return are the same thing seen from two sides — anyone who could genuinely produce fixed high profits wouldn't need your deposit.",
      cues: [
        "guarantee",
        "guaranteed",
        "no risk",
        "risk free",
        "promised returns",
        "fixed return",
        "always profit",
        "cant lose",
        "too good to be true",
        "40 percent",
        "returns in 7 days",
      ],
    },
    {
      id: "S2",
      signal:
        'Manufactured scarcity and a deadline — "6 spots, before midnight." Real opportunities don\'t expire at midnight',
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      short:
        "Six spots, before midnight. Real investments don't expire tonight — that clock exists to stop you sleeping on it or asking anyone.",
      cues: [
        "spots left",
        "6 spots",
        "midnight",
        "deadline",
        "scarcity",
        "limited",
        "urgency",
        "urgent",
        "hurry",
        "rush",
        "pressure",
        "time limit",
      ],
    },
    {
      id: "S3",
      signal:
        "Screenshots and testimonials are free to fake, and everyone posting them may work for the admin",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
      short:
        "Screenshots and thank-you messages cost nothing to produce, and the people posting them may work for the admin.",
      cues: [
        "screenshot",
        "screenshots",
        "testimonial",
        "proof is fake",
        "anyone can fake",
        "easy to fake",
        "photoshop",
        "edited",
        "people could be",
      ],
    },
    {
      id: "S4",
      signal:
        '"Withdraw your first profit" is the trap, not the proof. Early small withdrawals are allowed on purpose to buy your trust before the large deposit',
      weight: 3,
      polarity: "red_flag",
      tier: "expert",
      note: "The thing that convinces you is a deliberate feature of the scam.",
      short:
        "The early withdrawal works on purpose. Letting you take a small profit out in week one is the cheapest possible purchase of your trust, bought so you deposit far more in week four.",
      cues: [
        "withdraw",
        "small amount first",
        "test it with",
        "try a small",
        "let you take out",
        "first profit",
        "buying trust",
        "gains your trust",
        "bait",
      ],
    },
    {
      id: "S5",
      signal:
        "You will be asked to pay to withdraw later — a fee, a tax, a verification charge. Genuine brokers never ask you to deposit more money in order to withdraw your funds",
      weight: 3,
      polarity: "red_flag",
      tier: "expert",
      short:
        "When you try to take out the large amount, there'll be a fee, a tax, a verification charge. No genuine broker ever asks you to send money in order to receive your own money.",
      cues: [
        "fee to withdraw",
        "pay to withdraw",
        "release fee",
        "tax to release",
        "cant get the money out",
        "wont let you withdraw",
        "more money to get",
      ],
    },
    {
      id: "S6",
      signal: "Only admins can post — no independent voice can exist in the room",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
      short:
        "Only admins can post. Nobody who lost money could tell you, even if they wanted to.",
      cues: [
        "only admins",
        "cant post",
        "cant reply",
        "no one can message",
        "comments are off",
        "controls the group",
        "one person can speak",
      ],
    },
    {
      id: "S7",
      signal:
        "Members active at 3am, every night, all celebrating — a group of people with jobs does not behave like this",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
      short:
        "Members posting at 3am, every night, all of them celebrating. A group of people with jobs doesn't behave like this.",
      cues: [
        "3am",
        "middle of the night",
        "timestamps",
        "always active",
        "all positive",
        "everyone is winning",
        "nobody loses",
      ],
    },
    {
      id: "S8",
      signal:
        "Scepticism is welcomed and answered, not deleted — the visible doubt is part of the staging",
      weight: 2,
      polarity: "red_flag",
      tier: "expert",
      short:
        "Someone asked “is this safe?” and was answered warmly rather than removed. A room with no visible doubt looks staged, so the doubt is staged too.",
      cues: [
        "doubt",
        "sceptic",
        "skeptic",
        "questioned it",
        "someone asked",
        "answered nicely",
        "not deleted",
        "part of the act",
      ],
    },
    {
      id: "S9",
      signal:
        "Onboarding happens in DMs — you get separated from the group before you pay",
      weight: 3,
      polarity: "red_flag",
      tier: "advanced",
      short:
        "You're moved into private messages before you pay. Separating you from the group is the step that has to happen before the money does.",
      cues: [
        "dm",
        "private message",
        "privately",
        "message me directly",
        "one to one",
        "away from the group",
        "separate",
      ],
    },
    {
      id: "S10",
      signal: "You never asked to join. Someone added you",
      weight: 1,
      polarity: "red_flag",
      tier: "expert",
      short: "You never asked to join this group. Somebody added you to it.",
      cues: [
        "never joined",
        "didnt join",
        "added me",
        "was added",
        "didnt ask to be",
        "never signed up",
      ],
    },
  ],

  canonical_reasoning: `This is fake, and it will be the most convincing fake you look at — because it's designed to survive you testing it.

Start with the sentence that settles it on its own: **guaranteed returns.** Risk and return are the same thing viewed from two sides. Anyone who could genuinely produce fixed, high, guaranteed profits would not need your deposit — banks would fund them at any price. There is no legitimate investment anywhere in the world that guarantees you a fixed return in seven days, and no other red flag in this group is needed once you see that one.

Then the countdown. Six spots, before midnight. Real investments do not expire tonight; that deadline exists only to stop you from sleeping on it, checking the name, or asking someone who knows more than you. Urgency is not opportunity. Urgency is the absence of time to think, engineered on purpose.

The screenshots and the thank-you messages cost nothing. Anyone can make a dashboard show a green number, and the people posting may well be working for the admin. Social proof is the easiest thing in this entire group to manufacture, which is exactly why there's so much of it.

Now the part that matters most, and the reason this scam takes people who are careful. **Look at what he invites you to do: withdraw early, and see for yourself.** That withdrawal will work. It's supposed to. Letting you take out a small profit in week one is not evidence the operation is real — it's the cheapest possible purchase of your trust, and it's bought so that you'll deposit something much larger in week four. The thing that convinces you is the product.

And when you eventually try to take the large amount out, the money will not come. There will be a fee to release it, a tax to clear it, a verification charge. That's the actual ending of every version of this, and the rule that cuts it off before it starts: **no genuine broker ever asks you to send money in order to receive your own money.**

Two more things worth seeing. Only the admin can post — so no one who lost money could tell you even if they wanted to. And a member asked "is this safe?" and was answered warmly instead of removed, because a room with no visible doubt looks staged. The doubt is set dressing too.

What protects you isn't spotting all ten of these. It's one habit: **check the name outside the room.** Look up the platform with your country's financial regulator, away from the group, before any money moves. If it isn't registered, that is the whole answer — and if the group tells you registration doesn't apply to them, that's also the whole answer.`,

  rubric: {
    accept: [
      { names: ["S1"] },
      { anyOf: ["S4", "S5"], min: 1 },
      { anyOf: ["S2", "S3", "S6", "S7", "S9"], min: 2 },
    ],
    partial: [
      {
        anyOf: ["S2", "S3", "S6", "S7", "S8", "S9", "S10"],
        min: 1,
        andNot: ["S1", "S4", "S5"],
      },
    ],
    bonusAdvanced: ["S4", "S5"],
    sufficientAlone: ["S1"],
    feedbackConstraints: [
      'S1 alone is full credit — "you can\'t guarantee investment returns" is the complete rule.',
      'If dangerous_reasoning fires ("I\'d test it with a small amount first"), that must be the ONE signal the feedback names. It is the most dangerous answer a learner can give, because the small test IS the mechanism.',
    ],
    feedback: {
      strongest:
        "Guaranteed returns. That sentence settles it on its own, and no other flag in the group is needed once you see it. Risk and return are the same thing viewed from two sides — anyone who could genuinely produce fixed, high, guaranteed profits would never need your deposit, because banks would fund them at any price.",
      takeaway:
        "Check the name outside the room. Look the platform up with your country's financial regulator, away from the group, before any money moves — and if the group tells you registration doesn't apply to them, that's your answer too.",
      wrongVerdictNote:
        "This is the most convincing thing in the set, and deliberately so — it is built to survive being tested. The doubt in the room, the screenshots, the withdrawal that works: all of it is there to answer the exact questions a careful person asks.",
    },
  },

  distractors: [
    {
      claim: "The returns are too high to be real",
      correction:
        "Very close — but the tell is the guarantee, not the size. High-return investments genuinely exist; guaranteed ones don't. Sharpening that distinction is what makes the rule work on the next offer, which will promise less.",
      cues: [
        "returns are too high",
        "too high to be",
        "unrealistic returns",
        "no one makes that much",
        "40 percent is too",
      ],
    },
    {
      claim: "The screenshots look fake",
      correction:
        "They're made to look real, and in documented cases they do. That's guessing at image quality rather than reasoning about the offer — the screenshots would be just as worthless if they were flawless.",
      cues: [
        "screenshots look fake",
        "look photoshopped",
        "images look",
        "poorly edited",
        "you can tell theyre fake",
      ],
    },
    {
      claim: "I'd test it with a small amount first",
      correction:
        "This is the one to stop on, because the small test is the mechanism. That first withdrawal is allowed to succeed on purpose — it is the cheapest possible way to buy your trust before the deposit that actually matters. Testing it doesn't check the operation; it enrols you in it.",
      flag: "dangerous_reasoning",
      cues: [
        "test it with a small",
        "try a small amount",
        "start small",
        "small amount first",
        "invest a little first",
        "try it with a bit",
        "put in a small",
      ],
    },
    {
      claim: "Real investments don't use WhatsApp",
      correction:
        "Increasingly everything is marketed everywhere, including legitimate products. The medium isn't the tell — the guarantee is.",
      cues: [
        "dont use whatsapp",
        "wouldnt use whatsapp",
        "not on a messaging app",
        "real brokers dont",
        "no real investment uses",
      ],
    },
  ],

  reveal: {
    headline: "This is now one of the largest fraud categories in the world.",
    body: "India's cybercrime coordination centre has warned that fraudsters create fake investment groups on WhatsApp and Telegram, pose as market experts or representatives of well-known financial firms, and run fake trading apps that display profits before blocking withdrawals — advising people to treat guaranteed returns and VIP stock tips as red flags, never download trading apps through private links, and remember that genuine brokers never require a further deposit to release funds.\n\nThe staging is deliberate and documented: group \"members\" are often scammers or bots posting profit screenshots, victims are started on a small amount, small withdrawals may be permitted to build confidence, and when a larger withdrawal is attempted the obstacles begin — taxes, fees, verification, frozen accounts — until the platform and the group disappear. Average reported losses run to roughly $177,000 per victim, with many people investing retirement savings or taking out loans against fabricated returns. WhatsApp alone removed more than 6.8 million accounts linked to these networks.\n\nWorth telling learners: the people sending these messages are frequently not free agents. Perpetrators are typically themselves victims of fraud factories — recruited abroad under false pretences, trafficked, and forced to run the scams by organized crime groups. The person on the other end of the message may be a captive.",
  },

  call_script: null,
  content_warning: false,
  content_warning_text: null,
  skippable_without_penalty: false,
  sequence_order: 6,
};

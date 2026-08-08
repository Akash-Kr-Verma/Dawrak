// MODULE 02 — Used Bicycle Listing (Control — REAL)
//
// The only REAL module in the set. Its whole pedagogical value is breaking a
// pattern the learner has started to form, so it must not appear first —
// enforced by public.validate_module_sequence().
import type { AuthoredModule } from "@/types/modules";

export const m02: AuthoredModule = {
  slug: "marketplace-bicycle-genuine",
  title: "Used Bicycle Listing",
  verdict: "real",
  difficulty: 3, // deliberately not easy
  format: "marketplace_listing",
  est_seconds: 75,
  tags: ["control", "marketplace", "over-flagging"],

  // The second paragraph is the whole module: it tells the learner that the
  // stakes of a false positive exist, which no other module says. It belongs
  // in prompt_text, not in a help tooltip.
  prompt_text: `You're looking to buy a used bike and you find this listing.

Not everything online is a scam — and calling something fake when it isn't has a cost too. It means missing a good deal, or worse, treating an honest person like a criminal. **Judge this one on the evidence in front of you.**`,
  question_variant: null,
  verdict_labels: { positive: "Real", negative: "Fake" },

  render_spec: {
    engine: "screen_sequence",
    frame: "phone",
    screens: [
      {
        id: "listing",
        kind: "marketplace_listing",
        props: {
          // Elements 10-12 are what make it read as genuinely Facebook, and
          // three of them are also signals. Don't cut them for time.
          sections: [
            "photo_carousel",
            "title",
            "price",
            "meta_line",
            "condition_chip",
            "buttons_row",
            "divider",
            "description",
            "divider",
            "seller_card",
            "location_block",
            "footer",
          ],
          photoCount: 4,
          carouselAspect: "4:3",
          descriptionTruncateLines: 3,
          locationCaption: "Location is approximate",
        },
      },
    ],
  },

  assets: [
    {
      slot: "photo_1",
      what: "Whole bike, side-on, outdoors",
      source: "Unsplash / Pexels — `used bicycle side view`",
      license: "Unsplash License / Pexels License — free commercial, no attribution required",
    },
    {
      slot: "photo_2",
      what: "Drivetrain / gears close-up",
      source: "Unsplash / Pexels — `bicycle gears closeup`",
      license: "Unsplash License / Pexels License",
    },
    {
      slot: "photo_3",
      what: "Handlebars & brakes",
      source: "Unsplash / Pexels — `bicycle handlebars detail`",
      license: "Unsplash License / Pexels License",
    },
    {
      slot: "photo_4",
      what: "A visible scuff or worn tyre",
      source: "Unsplash / Pexels — `worn bicycle tire`",
      license: "Unsplash License / Pexels License",
      note: "Photo 4 is doing real work. An honest used-item listing shows the flaw; scam listings use pristine catalog images. Include the scuff.",
    },
    {
      slot: "avatar_seller",
      what: "Neutral human portrait",
      source: "DiceBear / Boring Avatars (generated)",
      license: "Free",
      note: "Do not use a real person's photo.",
    },
  ],

  content_blocks: {
    title: '{{BIKE_BRAND}} 21-Speed Mountain Bike — 26" wheels',
    price: "{{CURRENCY}} {{PRICE}}",
    meta: "Listed 6 days ago in {{CITY}}",
    condition: "Used – good",
    description: `Selling my bike, I've had it about three years and it's been
good to me but I don't ride much anymore.

Everything works. Gears shift fine, brakes are solid. Tyres
were replaced last year. There's a scratch on the top tube
(4th photo) and the paint is faded near the seat post — it's
been outside a lot.

Pickup only from {{NEIGHBOURHOOD}}. You're welcome to come try
it before you decide. Cash on pickup.

Small negotiation possible but please don't message just to
ask "last price" — come see it.`,
    seller_card: {
      name: "{{SELLER_NAME}}",
      joined: "Joined Facebook in {{YEAR_MINUS_7}}",
      rating: "⭐ 4.8 · 12 ratings",
    },
    footer: "Meet in a public place. Check the item before you pay.",
    // Photos must look shot by the same person, same phone, same session.
    // Mismatched lighting or four different bikes is exactly the signal we're
    // teaching learners to detect — we'd be accidentally building a fake.
    photo_consistency_note:
      "Filter by one photographer's set. Consistent lighting and background are mandatory.",
  },

  // Green flags — same field, positive polarity.
  signals: [
    {
      id: "G1",
      signal:
        "Discloses a flaw and points to the photo of it — scammers don't advertise defects",
      weight: 3,
      polarity: "green_flag",
    },
    {
      id: "G2",
      signal:
        "Pickup only, pay in person — no pressure toward transfer or deposit",
      weight: 3,
      polarity: "green_flag",
    },
    {
      id: "G3",
      signal: "Invites inspection before payment — the opposite of urgency",
      weight: 3,
      polarity: "green_flag",
    },
    {
      id: "G4",
      signal:
        "Multi-year account with a rating history — costly to fake, cheap to check",
      weight: 2,
      polarity: "green_flag",
    },
    {
      id: "G5",
      signal: 'Price is ordinary — no "too good to be true" hook',
      weight: 2,
      polarity: "green_flag",
    },
    {
      id: "G6",
      signal:
        "Photos are consistent and clearly the actual item, not catalog stock",
      weight: 2,
      polarity: "green_flag",
    },
    {
      id: "G7",
      signal: 'No urgency at all — no countdown, no "3 other buyers waiting"',
      weight: 2,
      polarity: "green_flag",
    },
  ],

  canonical_reasoning: `This one is real — and noticing that is a skill, not a lucky guess.

Look at what the seller does that a scammer has no reason to do. They point out a scratch and tell you which photo shows it. They ask you to come see the bike before you pay anything. They want cash, in person, in their own neighbourhood. Every one of those makes the sale *slower* and *harder* — and a scam's entire business model is speed. Someone trying to take your money wants the transfer to happen before you think. This person is doing the opposite.

The account backs it up: years old, with a rating history. That's not impossible to fake, but it's expensive, and scam accounts are usually days old because the last ten got shut down.

And the price is just… a price. Nothing about this listing is trying to make you feel anything.

Here's the part that matters beyond this bike: being suspicious of everything is not the same as being good at spotting scams. If you flag this listing, you'd also flag every honest seller in your city. The skill is telling the difference — and the difference is *specific evidence*, not a general feeling that the internet is dangerous.`,

  rubric: {
    accept: [{ anyOf: ["G1", "G2", "G3", "G4", "G5", "G6", "G7"], min: 2 }],
    partial: [{ anyOf: ["G1", "G2", "G3", "G4", "G5", "G6", "G7"], min: 1 }],
    // Calling this fake is over-flagging — the exact failure mode the module
    // exists to catch. Three across the set feeds Personalized Path.
    wrongVerdict: { score: "reject", flags: ["over_flagged"] },
    feedbackConstraints: [
      "A learner who called this fake must not simply be told 'wrong'. Feedback must: (1) acknowledge that caution is a good instinct, (2) ask them to point at the specific evidence they were reacting to, (3) name the two strongest green flags they walked past, (4) state the cost of a false positive in one line.",
      "PARTIAL also applies to reasoning purely from absence ('nothing seems wrong') — push toward specific evidence.",
    ],
  },

  distractors: [
    {
      claim: "The account could be hacked / stolen",
      correction:
        "Technically possible, but if unfalsifiable suspicion counts as reasoning, nothing is ever real. Push back on this one directly.",
    },
    {
      claim: "The photos could be stolen from somewhere else",
      correction:
        "Same problem. Ask: is there evidence they were, or is this just something that could be true?",
    },
    {
      claim: "Cash only is suspicious",
      correction:
        "Cash-on-pickup is the safest method for a used-goods sale. This is a genuinely valuable teaching moment.",
    },
  ],

  reveal: {
    headline: "Getting this one right is harder than getting the scams right.",
    body: "Most people who train on scam-spotting get *worse* at trusting anything — they learn the pattern \"online = danger\" instead of learning to read evidence. Being able to say \"this one is fine, and here's why\" is the harder half of the skill.",
  },

  call_script: null,
  content_warning: false,
  content_warning_text: null,
  skippable_without_penalty: false,
  sequence_order: 3, // after two fakes — see the placement rule
};

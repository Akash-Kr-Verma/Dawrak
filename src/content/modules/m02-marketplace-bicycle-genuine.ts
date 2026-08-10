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
      what: "Whole bike, side-on, leaning against a wall outdoors",
      source: "src/components/modules/BikePhotos.tsx — drawn in-app",
      license: "Ours",
    },
    {
      slot: "photo_2",
      what: "Front three-quarter view, taken standing over the bike",
      source: "src/components/modules/BikePhotos.tsx — drawn in-app",
      license: "Ours",
    },
    {
      slot: "photo_3",
      what: "Drivetrain close-up — chainring, chain, cassette, derailleur",
      source: "src/components/modules/BikePhotos.tsx — drawn in-app",
      license: "Ours",
    },
    {
      slot: "photo_4",
      what: "Close-up of the scratch on the top tube, with the faded paint behind it",
      source: "src/components/modules/BikePhotos.tsx — drawn in-app",
      license: "Ours",
      note: "Photo 4 is doing real work and is not optional. An honest used-item listing shows the flaw; scam listings use pristine catalog images. The description points the buyer at THIS photo, so the scratch has to actually be visible in it — a placeholder here turns the module's strongest green flag into something the learner has to take on trust.",
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
    // teaching learners to detect — we'd be accidentally building a fake. This
    // is why they are drawn rather than sourced: no stock library has four
    // photos of one used bike with the scratch the description names.
    photo_consistency_note:
      "One bike, one lighting setup, one session, across all four frames. See BikePhotos.tsx.",
  },

  // Green flags — same field, positive polarity.
  //
  // Weight is doing real work in this module. G1-G3 are the three that settle
  // it; G4-G7 are true, useful, and not enough on their own. A learner who
  // calls this real because the account is old has made a correct call for a
  // weak reason, and the feedback has to be able to say so — otherwise the
  // lesson they take away is "trust old accounts", which is the next scam.
  signals: [
    {
      id: "G1",
      signal:
        "Discloses a flaw and points to the photo of it — scammers don't advertise defects",
      weight: 3,
      polarity: "green_flag",
      short:
        "The seller volunteers a flaw — a scratch on the top tube — and tells you which photo shows it. Nobody advertises a defect on an item they don't actually have.",
      cues: [
        "scratch",
        "mentions the damage",
        "shows the damage",
        "discloses",
        "admits",
        "points to the photo",
        "honest about",
        "upfront about",
        "tells you what is wrong",
        "faded paint",
        "faded",
        "doesnt hide",
        "does not hide",
        "shows the flaw",
        "mentions the fault",
      ],
    },
    {
      id: "G2",
      signal:
        "Pickup only, pay in person — no pressure toward transfer or deposit",
      weight: 3,
      polarity: "green_flag",
      short:
        "Pickup only, paid in person. No transfer, no deposit — nothing that moves money before you have the bike in your hands.",
      cues: [
        "cash on pickup",
        "cash when i pick",
        "cash when i collect",
        "pay when i pick",
        "pay when i collect",
        "pay on pickup",
        "pay in person",
        "paying in person",
        "pickup only",
        "pick up only",
        "collect in person",
        "meet in person",
        "no deposit",
        "no transfer",
        "no advance payment",
        "not asking for money upfront",
        "no money upfront",
      ],
    },
    {
      id: "G3",
      signal: "Invites inspection before payment — the opposite of urgency",
      weight: 3,
      polarity: "green_flag",
      short:
        "You're invited to try the bike before you pay. Every scam needs the money to move before you can check what you're buying.",
      cues: [
        "inspect",
        "try it before",
        "try before",
        "test it",
        "test ride",
        "see it before",
        "check it before",
        "look at it before",
        "come and see",
        "come see it",
        "welcome to come",
        "check the bike first",
        "see the bike first",
      ],
    },
    {
      id: "G4",
      signal:
        "Multi-year account with a rating history — costly to fake, cheap to check",
      weight: 2,
      polarity: "green_flag",
      short:
        "A years-old account with a rating history. Possible to fake, expensive to fake — most scam accounts are days old because the last ten got shut down.",
      cues: [
        "account is old",
        "old account",
        "account has been",
        "joined",
        "years on facebook",
        "long time account",
        "established account",
        "rating",
        "ratings",
        "reviews",
        "history",
        "profile looks real",
        "real profile",
      ],
    },
    {
      id: "G5",
      signal: 'Price is ordinary — no "too good to be true" hook',
      weight: 2,
      polarity: "green_flag",
      short:
        "The price is ordinary. There's no bargain doing the persuading, which is what a too-good-to-be-true price is for.",
      cues: [
        "price is",
        "priced",
        "reasonable price",
        "fair price",
        "normal price",
        "not too cheap",
        "isnt too cheap",
        "not too good to be true",
        "realistic price",
        "market price",
      ],
    },
    {
      id: "G6",
      signal:
        "Photos are consistent and clearly the actual item, not catalog stock",
      weight: 2,
      polarity: "green_flag",
      short:
        "The photos are of this bike, taken in one session, flaws included — not catalogue shots of a bike that could be anywhere.",
      cues: [
        "photos",
        "photo",
        "pictures",
        "images",
        "not stock",
        "real photos",
        "actual bike",
        "same bike",
        "taken on a phone",
        "look like they were taken",
      ],
    },
    {
      id: "G7",
      signal: 'No urgency at all — no countdown, no "3 other buyers waiting"',
      weight: 2,
      polarity: "green_flag",
      short:
        "No countdown, no other buyers waiting, no reason you have to decide today. Urgency is the tool that stops you checking.",
      cues: [
        "no urgency",
        "not urgent",
        "no rush",
        "not rushing",
        "no pressure",
        "not pressuring",
        "not pushing",
        "no deadline",
        "not forcing",
        "takes his time",
      ],
    },
  ],

  canonical_reasoning: `This one is real — and noticing that is a skill, not a lucky guess.

Look at what the seller does that a scammer has no reason to do. They point out a scratch and tell you which photo shows it. They ask you to come see the bike before you pay anything. They want cash, in person, in their own neighbourhood. Every one of those makes the sale *slower* and *harder* — and a scam's entire business model is speed. Someone trying to take your money wants the transfer to happen before you think. This person is doing the opposite.

The account backs it up: years old, with a rating history. That's not impossible to fake, but it's expensive, and scam accounts are usually days old because the last ten got shut down.

And the price is just… a price. Nothing about this listing is trying to make you feel anything.

Here's the part that matters beyond this bike: being suspicious of everything is not the same as being good at spotting scams. If you flag this listing, you'd also flag every honest seller in your city. The skill is telling the difference — and the difference is *specific evidence*, not a general feeling that the internet is dangerous.`,

  rubric: {
    // Changed from "any two green flags" to "at least one of the three that
    // actually settle it". Under the old rule, "the account is old and the
    // price looks normal" was full credit — two true observations, neither of
    // which would protect anyone, and the learner was told they'd reasoned
    // well. Weak-only reasoning is now PARTIAL, and the feedback names the
    // stronger evidence they walked past.
    accept: [{ anyOf: ["G1", "G2", "G3"], min: 1 }],
    partial: [{ anyOf: ["G4", "G5", "G6", "G7"], min: 1, andNot: ["G1", "G2", "G3"] }],
    // Calling this fake is over-flagging — the exact failure mode the module
    // exists to catch. Three across the set feeds Personalized Path.
    wrongVerdict: { score: "reject", flags: ["over_flagged"] },
    feedbackConstraints: [
      "A learner who called this fake must not simply be told 'wrong'. Feedback must: (1) acknowledge that caution is a good instinct, (2) ask them to point at the specific evidence they were reacting to, (3) name the two strongest green flags they walked past, (4) state the cost of a false positive in one line.",
      "PARTIAL also applies to reasoning purely from absence ('nothing seems wrong') — push toward specific evidence.",
      "Do not praise reasoning that rests only on account age, ratings, or price. Say plainly that it is supporting evidence and name what is stronger.",
    ],
    feedback: {
      strongest:
        "You can inspect the bike before any money moves. That single fact is what makes this listing safe to believe — a scam needs payment to happen before you can check what you're buying, and a seller who says come and try it, pay me when you collect it, has given away the only advantage a scammer has.",
      takeaway:
        "Being suspicious of everything is not the same skill as spotting a scam. Ask yourself what specific evidence you are reacting to — if you can't name one, that's a feeling, not a finding.",
      wrongVerdictNote:
        "Caution is a good instinct, and this one is deliberately hard. But a false alarm costs something too: it means walking past honest sellers and treating ordinary people as criminals. Being able to say “this one is fine, and here's why” is the harder half of the skill.",
    },
  },

  distractors: [
    {
      claim: "The account could be hacked / stolen",
      correction:
        "It could be — and there's nothing in the listing suggesting it was. If suspicion that can't be checked counts as reasoning, then nothing is ever real, and that isn't a skill you can use.",
      cues: [
        "could be hacked",
        "account was hacked",
        "hacked",
        "stolen account",
        "account is stolen",
        "hijacked",
        "someone took over",
      ],
    },
    {
      claim: "The photos could be stolen from somewhere else",
      correction:
        "Same problem. The question worth asking is whether there's evidence they were taken from somewhere else — not whether it's possible.",
      cues: [
        "photos could be stolen",
        "stolen photos",
        "stolen pictures",
        "taken from google",
        "from the internet",
        "copied photos",
        "reverse image",
        "someone elses photos",
      ],
    },
    {
      claim: "Cash only is suspicious",
      correction:
        "The other way round: cash on pickup is the safest way to buy a used item. You hand over money only once you've seen the thing, and there's no payment to reverse or chargeback to argue about later.",
      // Deliberately only the NEGATIVE framings. "Cash on pickup" is a green
      // flag in this module (G2) and half the correct answers will contain the
      // word "cash" — a bare cue here would fire the correction at the very
      // learners who reasoned well.
      cues: [
        "cash only is suspicious",
        "cash is suspicious",
        "cash is a red flag",
        "suspicious that he wants cash",
        "insists on cash",
        "cash is sketchy",
        "cash is dodgy",
        "why does he want cash",
      ],
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

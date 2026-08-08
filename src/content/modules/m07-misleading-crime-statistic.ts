// MODULE 07 — "Crime Up 300%" (Misleading But True)
//
// The only module where every individual fact is true and the answer is still
// "don't trust this". A binary real/fake button handles that badly: a learner
// who taps "real" because the numbers check out has reasoned WELL.
//
// Resolution (spec Option A): keep the two buttons, change the question.
// `question_variant` carries the accuracy-framed question and `verdict_labels`
// relabels the buttons. `verdict` stays 'fake' in the DB so nothing else
// breaks. If the two-stage variant (Option B) is ever built, question_variant
// splits into stage_1 / stage_2.
import type { AuthoredModule } from "@/types/modules";

export const m07: AuthoredModule = {
  slug: "misleading-crime-statistic",
  title: '"Crime Up 300%"',
  verdict: "fake",
  difficulty: 5,
  format: "social_post_with_chart",
  est_seconds: 120,
  tags: ["statistical_manipulation", "technically_true", "framing"],

  // Telling the learner up front that the numbers are real is not giving away
  // the answer — it removes the wrong answer so they have to find the actual
  // skill. Without that line, half of them guess "fake, the numbers are made
  // up" and learn nothing.
  prompt_text: `This post is going around your local community group. **Every number in it is accurate — nobody made anything up.**

Is it giving you an accurate picture of what's happening in your city?`,
  question_variant:
    "Is this post giving you an accurate picture of what's happening in your city?",
  verdict_labels: { positive: "Accurate picture", negative: "Misleading" },

  render_spec: {
    engine: "screen_sequence",
    frame: "phone",
    screens: [
      {
        id: "community_post",
        kind: "community_post_with_chart",
        props: {
          groupHeader: "{{CITY}} Community Watch",
          groupMembers: "12.4K members",
          postAge: "2h",
          chart: {
            // Build as SVG in-app, not an image — so the truncated axis is
            // exact and it localizes. The chart IS the asset.
            bars: [
              { label: "Jan", value: 2 },
              { label: "Feb", value: 8 },
            ],
            // Starting at 1 instead of 0 makes the second bar look far taller
            // than four-times-taller. Signal S4.
            yAxisStart: 1,
            yAxisLabeled: false,
            barColor: "red",
            overlayArrow: true,
            axisTitle: null,
            units: null,
            sourceLine: null,
            title: "CRIME — THIS YEAR",
          },
          smallPrint: {
            fontSizePx: 9,
            color: "grey",
            lowContrast: true,
            // Must be ACTUALLY readable when zoomed. The lesson is "you didn't
            // look", not "you couldn't look".
            zoomable: true,
          },
          engagement: { shares: "3.4K", comments: "212" },
          topComment: "This is what happens when nobody does anything 😡",
        },
      },
    ],
  },

  assets: [
    {
      slot: "chart_graphic",
      what: "The two-bar chart",
      source: "Build it as SVG in-app, not an image",
      license: "Ours",
      note: "Building it ourselves means we control the deception precisely, and the truncated axis stays exact across locales.",
    },
    {
      slot: "avatar_poster",
      what: "Poster avatar",
      source: "DiceBear",
      license: "Free",
    },
  ],

  content_blocks: {
    headline: `🚨 SHOCKING: CRIME IN {{CITY}} IS UP 300% THIS YEAR 🚨

Nobody is talking about this. SHARE before it gets taken down.`,
    chart_bars: [2, 8],
    small_print: `Source: {{NEIGHBOURHOOD}} incident log. January (2 incidents)
compared with February (8 incidents).`,
    top_comment: "This is what happens when nobody does anything 😡",
  },

  signals: [
    {
      id: "S1",
      signal:
        'A percentage hiding tiny raw numbers. 2 → 8 is "300% up" and also "six more incidents". The percentage is chosen because it\'s the bigger-sounding of two true descriptions',
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S2",
      signal:
        'Two months presented as "this year" — the headline says a year, the data is one month against another',
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S3",
      signal:
        "One neighbourhood presented as the whole city — the sample and the claim are different sizes",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S4",
      signal:
        "Truncated y-axis — starting at 1 instead of 0 makes the bar look far taller than the data",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
    },
    {
      id: "S5",
      signal:
        "No baseline, no trend, no comparison. Two data points cannot show a trend. Is 8 normal for February? You aren't given anything to judge that",
      weight: 3,
      polarity: "red_flag",
      tier: "expert",
      note: "The deepest one. Any two numbers in the world produce a percentage change, and picking the pair that yields the biggest number is a technique, not an analysis.",
    },
    {
      id: "S6",
      signal:
        "The small print contradicts the headline and is styled to be skipped",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
    },
    {
      id: "S7",
      signal:
        "Shares ≫ comments, and the top comment reacts to the headline, not the data",
      weight: 1,
      polarity: "red_flag",
      tier: "expert",
    },
  ],

  canonical_reasoning: `Every number here is true, and the post is still lying to you. That's the whole point of this one.

Crime went from 2 incidents to 8. That is, correctly, a 300% increase. It is also six more incidents. Both sentences describe the same fact, and whoever made this post picked the one that sounds like a catastrophe. When something goes from a very small number to a slightly less small number, percentages explode — which is exactly why percentages get used when raw numbers wouldn't be frightening enough.

Then check what's actually being compared. The headline says "this year." The small print says January against February. One month against the next, in one neighbourhood, presented as a citywide annual trend.

And two data points cannot show a trend. Is 8 a lot for February? Was last February 9? Was last January 7? You aren't given any of that, and without it, this graph tells you nothing. Nothing at all — not "a little," not "something." A pair of numbers with no baseline is not evidence.

Even the chart is in on it. The bottom of the axis starts at 1 instead of 0, so the second bar looks enormously taller than four-times-taller. That's a design choice, made on purpose.

So nobody fabricated anything, and you're still being deceived — by which comparison was picked, which context was left out, and which format made it look biggest. This is harder to catch than an invented number, and far more common, because it's how real institutions and real news outlets mislead people while remaining technically accurate.

The question that cuts through it every time: **compared to what?** Not "is this number real," but *compared to what, over what period, out of how many.* If a post won't tell you, that's your answer.`,

  rubric: {
    accept: [
      { anyOf: ["S1", "S2", "S3", "S5"], min: 1 },
      { anyOf: ["S4", "S6", "S7"], min: 2 },
    ],
    partial: [
      { anyOf: ["S4", "S6", "S7"], min: 1, andNot: ["S1", "S2", "S3", "S5"] },
    ],
    bonusAdvanced: ["S5"],
    // Judging the post accurate is the wrong verdict here.
    wrongVerdict: { score: "reject" },
    rejectOnDistractor: true,
    feedbackConstraints: [
      'SPECIAL CASE: if a learner answers "the numbers are fake/made up", that is a REJECT even though they distrusted the post. Correct it explicitly — believing the numbers are false means they have missed the entire lesson and will be defenceless against the next technically-true post.',
      'Saying only "it\'s misleading" with no specific mechanism is PARTIAL, not ACCEPT.',
    ],
  },

  distractors: [
    {
      claim: "The numbers are made up",
      correction:
        "They aren't, and the prompt said so. The most common wrong answer here, and it must be corrected explicitly.",
    },
    {
      claim: "It uses emojis and caps so it's not serious",
      correction: "Tone isn't evidence. Serious outlets do this too.",
    },
    {
      claim: "No source is cited",
      correction:
        "A source IS cited, in the small print. Saying this means they didn't read it.",
    },
    {
      claim: "300% is impossible",
      correction:
        "It's arithmetically fine. Correct this; percentage illiteracy is part of what's being exploited.",
    },
  ],

  reveal: {
    headline:
      "The hardest misinformation to catch contains no false statements.",
    body: 'Fabricated claims can be fact-checked. Selective framing can\'t — every individual fact survives verification, and the deception lives in what was chosen and what was left out. This is why "is it true?" is a weaker question than "compared to what?"',
  },

  call_script: null,
  content_warning: false,
  content_warning_text: null,
  skippable_without_penalty: false,
  sequence_order: 5,
};

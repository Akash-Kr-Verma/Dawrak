// MODULE 07 — "Crime Up 300%" (Misleading But True)
//
// The only module where every individual fact is true and the answer is still
// "don't trust this".
//
// This used to relabel its buttons to "Accurate picture / Misleading" so that a
// learner who tapped "real" on true numbers wasn't marked wrong. That solved a
// real problem and created a worse one: the judgement interaction changed shape
// in the middle of the set, so the one module about the subtlest technique was
// also the one where the learner had to relearn the controls.
//
// It now asks REAL or FAKE like everything else, and the nuance moved to where
// it actually belongs — the explanation, which states outright that nothing was
// fabricated and that the framing is what makes the post fake. `prompt_text`
// carries the disambiguation the buttons can't.
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

A post can still be fake. Judge what it is telling you, not only whether the figures check out.`,
  question_variant: null,
  verdict_labels: { positive: "Real", negative: "Fake" },

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
            // than four-times-taller. Signal S4. With 8 ticks over the plot
            // area, 8 renders seven times the height of 2 — the real ratio is
            // four. That gap is the whole of S4 and it is exact.
            yAxisStart: 1,
            // The axis IS labelled now, and the bars carry their values. The
            // learner is being asked whether the post gives a real picture;
            // they cannot answer that about a chart whose numbers they can't
            // read. The deception is the truncation and the arrow, not
            // illegibility — and it survives being fully readable, which is
            // precisely what makes this technique worth teaching.
            yAxisLabeled: true,
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
      short:
        "2 → 8 is a 300% increase and also six more incidents. Both are true; the post picked the one that sounds like a catastrophe.",
      cues: [
        "raw numbers",
        "actual numbers",
        "real numbers are small",
        "small numbers",
        "tiny numbers",
        "only 6",
        "six more",
        "only six",
        "2 to 8",
        "two to eight",
        "from 2 to 8",
        "just 8",
        "only 8 incidents",
        "percentage sounds",
        "percentage makes",
        "sounds bigger",
        "small base",
        "300 sounds",
      ],
    },
    {
      id: "S2",
      signal:
        'Two months presented as "this year" — the headline says a year, the data is one month against another',
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      short:
        "The headline says “this year”. The data is one month against the next — January versus February.",
      cues: [
        "january",
        "february",
        "two months",
        "one month",
        "month to month",
        "not a year",
        "isnt a year",
        "whole year",
        "comparison period",
        "time period",
        "period",
        "two months isnt",
      ],
    },
    {
      id: "S3",
      signal:
        "One neighbourhood presented as the whole city — the sample and the claim are different sizes",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      short:
        "One neighbourhood's incident log, presented as the whole city. The sample and the claim are different sizes.",
      cues: [
        "neighbourhood",
        "neighborhood",
        "one area",
        "one district",
        "whole city",
        "citywide",
        "entire city",
        "not the city",
        "sample",
        "local area",
      ],
    },
    {
      id: "S4",
      signal:
        "Truncated y-axis — starting at 1 instead of 0 makes the bar look far taller than the data",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
      short:
        "The chart's axis starts at 1 rather than 0, so the second bar looks enormously taller instead of four times taller.",
      cues: [
        "axis",
        "y axis",
        "starts at 1",
        "doesnt start at zero",
        "not start at zero",
        "start from zero",
        "scale",
        "truncated",
        "chart exaggerates",
        "graph exaggerates",
        "bar looks",
        "chart is misleading",
        "graph is misleading",
      ],
    },
    {
      id: "S5",
      signal:
        "No baseline, no trend, no comparison. Two data points cannot show a trend. Is 8 normal for February? You aren't given anything to judge that",
      weight: 3,
      polarity: "red_flag",
      tier: "expert",
      note: "The deepest one. Any two numbers in the world produce a percentage change, and picking the pair that yields the biggest number is a technique, not an analysis.",
      short:
        "Two data points can't show a trend. Is 8 a lot for February? Was last February 9? You're given nothing to judge it against.",
      cues: [
        "baseline",
        "no context",
        "missing context",
        "compared to what",
        "two data points",
        "only two points",
        "not a trend",
        "cant show a trend",
        "no trend",
        "normal for february",
        "last year",
        "previous years",
        "no comparison",
        "average",
        "nothing to compare",
      ],
    },
    {
      id: "S6",
      signal:
        "The small print contradicts the headline and is styled to be skipped",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
      short:
        "The small print says something different from the headline, and it's styled so you skip over it.",
      cues: [
        "small print",
        "fine print",
        "small text",
        "tiny text",
        "grey text",
        "underneath",
        "caption",
        "footnote",
        "contradicts",
        "hidden text",
      ],
    },
    {
      id: "S7",
      signal:
        "Shares ≫ comments, and the top comment reacts to the headline, not the data",
      weight: 1,
      polarity: "red_flag",
      tier: "expert",
      short:
        "Far more shares than comments, and the top comment is reacting to the headline rather than to any of the data.",
      cues: [
        "shares",
        "shared more",
        "comments",
        "engagement",
        "people sharing",
        "reacting to the headline",
        "nobody read",
      ],
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
    // Calling the post real is the wrong verdict here.
    wrongVerdict: { score: "reject" },
    rejectOnDistractor: true,
    feedbackConstraints: [
      'SPECIAL CASE: if a learner answers "the numbers are fake/made up", that is a REJECT even though they distrusted the post. Correct it explicitly — believing the numbers are false means they have missed the entire lesson and will be defenceless against the next technically-true post.',
      'Saying only "it\'s misleading" with no specific mechanism is PARTIAL, not ACCEPT.',
    ],
    feedback: {
      strongest:
        "Crime went from 2 incidents to 8. That is, correctly, a 300% increase — and it is also six more incidents. Both sentences describe the identical fact, and whoever wrote this chose the one that sounds like a catastrophe. When a very small number grows slightly, percentages explode, which is exactly when percentages get reached for.",
      takeaway:
        "“Compared to what?” is usually a better question than “is this true?” — compared to what, over what period, out of how many. If a post won't tell you, that silence is your answer.",
      // The single most important line in this module. Without it, a learner
      // can tap FAKE, feel correct, and walk away believing the figures were
      // invented — which leaves them defenceless against the next post, since
      // the next one's figures will also survive fact-checking.
      correctVerdictNote:
        "One thing to be exact about, because it's the difference between a lesson that protects you and one that doesn't: nobody fabricated these numbers. Every figure in the post is real and would survive a fact-check. It is fake because true information has been framed to make you believe something that isn't so — through the comparison chosen, the context left out, and the shape of the chart.",
      wrongVerdictNote:
        "The figures do check out, so reading them as real is honest arithmetic. But the question was whether the post is giving you a real picture, and the fact that every number survives checking is precisely what makes this kind of post so hard to argue with.",
    },
  },

  distractors: [
    {
      claim: "The numbers are made up",
      correction:
        "They aren't — the numbers are real, and the prompt said so. This matters more than it looks: if you file this post under “made-up figures”, the next one will have real figures too, and you'll have nothing to catch it with.",
      cues: [
        "made up",
        "make up",
        "fabricated",
        "numbers are fake",
        "figures are fake",
        "invented",
        "false numbers",
        "lying about the numbers",
        "not real numbers",
        "statistics are fake",
      ],
    },
    {
      claim: "It uses emojis and caps so it's not serious",
      correction:
        "Tone isn't evidence. Serious outlets write headlines like this too, and plenty of deceptive posts are written in flat, sober language.",
      cues: [
        "emoji",
        "emojis",
        "caps",
        "capital letters",
        "all caps",
        "shouting",
        "clickbait",
        "the tone",
        "written like",
      ],
    },
    {
      claim: "No source is cited",
      correction:
        "A source is cited — it's in the small print under the chart. It names the neighbourhood log and the two months, which is the part that contradicts the headline.",
      cues: [
        "no source",
        "doesnt cite",
        "does not cite",
        "no citation",
        "where is the source",
        "unsourced",
        "no evidence",
        "didnt say where",
      ],
    },
    {
      claim: "300% is impossible",
      correction:
        "It's arithmetically fine: 2 to 8 is four times as many, which is a 300% increase. The arithmetic isn't the problem — the choice to describe it that way is.",
      cues: [
        "300 is impossible",
        "impossible",
        "cant be 300",
        "not possible",
        "doesnt add up",
        "maths is wrong",
        "math is wrong",
      ],
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

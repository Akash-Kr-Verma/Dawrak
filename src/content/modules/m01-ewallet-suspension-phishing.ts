// MODULE 01 — E-Wallet Account Suspension (Phishing)
import type { AuthoredModule } from "@/types/modules";

export const m01: AuthoredModule = {
  slug: "ewallet-suspension-phishing",
  title: "E-Wallet Account Suspension",
  verdict: "fake",
  difficulty: 2,
  format: "sms_plus_landing_page",
  est_seconds: 90,
  tags: ["phishing", "smishing", "otp", "financial"],

  prompt_text:
    "This message arrived on your phone this morning. You tap the link and this page opens. Real or fake — and how do you know?",
  question_variant: null,
  verdict_labels: { positive: "Real", negative: "Fake" },

  render_spec: {
    engine: "screen_sequence",
    frame: "phone",
    safety: [
      "Screen 2 is a React component rendered inside our own app. The address bar is static text in a <div> — a picture of an address bar.",
      "Never serve this from a lookalike domain, never wrap it in an iframe, never let the form POST anywhere.",
      "Fields are readOnly / wired to local state that goes nowhere.",
      "The brand is fictional. Do not ship a pixel-clone of a real bank.",
    ],
    screens: [
      {
        id: "sms",
        kind: "sms_thread",
        advance: { via: "link_tap", label: "{{SHORT_LINK}}" },
        props: {
          // Alphanumeric sender IDs are trivially spoofable. That is the point.
          senderShownAsName: true,
          timestamp: "Today 08:14",
          systemLine: "Text Message",
          verifiedBadge: false,
        },
      },
      {
        id: "landing",
        kind: "browser_login_page",
        advance: { via: "button", label: "Verify Now" },
        props: {
          // HTTPS proves encryption, not identity. Free TLS means phishing
          // pages show the padlock too — signal S6.
          showPadlock: true,
          addressBarStatic: true,
          fields: ["Phone number", "PIN", "One-time code (OTP)"],
          buttonLabel: "Verify Now",
          footer: "© {{WALLET_BRAND}}. All rights reserved.",
        },
      },
    ],
  },

  assets: [
    {
      slot: "logo_wallet",
      what: "Fictional e-wallet logomark — a lettermark in a circle",
      source: "Make it yourself (Figma, ~15 min)",
      license: "Ours",
    },
    {
      slot: "ui_chrome",
      what: "Phone frame, browser bar, padlock",
      source: "Pure CSS/SVG",
      license: "n/a",
      note: "No image needed — vector means it stays crisp and localizes without re-shooting.",
    },
    {
      slot: "favicon",
      what: "16px favicon in the address bar",
      source: "Same lettermark, scaled",
      license: "Ours",
    },
  ],

  content_blocks: {
    sms_body:
      "{{LEARNER_FIRST_NAME}}, your {{WALLET_BRAND}} account will be suspended within 24 hours due to unusual activity. Verify your identity now to avoid losing access: {{SHORT_LINK}}",
    sender_id: "{{WALLET_BRAND}}",
    address_bar: "{{LOOKALIKE_DOMAIN}}/verify-account",
    form_labels: ["Phone number", "PIN", "One-time code (OTP)"],
    button: "Verify Now",
    footer: "© {{WALLET_BRAND}}. All rights reserved.",
    // The rn->m homoglyph is Latin-script only and does not survive
    // translation into Arabic-script branding. Arabic packs use the
    // combosquat variant ({{BRAND}}-verify.com), which does transfer.
    lookalike_domain_note:
      "Latin packs: homoglyph (paynoorn.com). Arabic packs: combosquat ({{BRAND}}-verify.com).",
  },

  signals: [
    {
      id: "S1",
      signal:
        "Asks for PIN and OTP via a link — legitimate providers never do this",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S2",
      signal: 'Manufactured urgency — "within 24 hours" to stop you checking',
      weight: 2,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S3",
      signal: "Shortened link hides the real destination",
      weight: 2,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S4",
      signal: "Lookalike domain — not the provider's real address",
      weight: 3,
      polarity: "red_flag",
      tier: "advanced",
    },
    {
      id: "S5",
      signal:
        "Personalized with your name → suggests a data leak, not proof of legitimacy",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
      note: "The one that does real work. Learners are taught 'generic greeting = scam', which means a personalized scam sails straight past them. This inverts that instinct on purpose.",
    },
    {
      id: "S6",
      signal:
        "Padlock present but meaningless — HTTPS proves encryption, not identity",
      weight: 1,
      polarity: "red_flag",
      tier: "expert",
      note: "Bonus signal. Award it, don't require it.",
    },
  ],

  canonical_reasoning: `This is fake. Three things give it away, and one of them is designed to fool people who already know the basics.

First: no legitimate financial provider ever asks for your PIN or a one-time code through a link sent by message. An OTP exists to confirm an action *you* started, inside the official app. Anyone asking you to type one somewhere else is asking for the one thing that defeats your bank's security.

Second: the 24-hour deadline is manufactured. Urgency is not information — it's a tool to stop you from pausing, checking the app yourself, or asking someone you trust. Real account issues wait for you.

Third, and this is the harder one: the message uses your actual first name, and the page has a padlock and a domain that looks right at a glance. None of that is proof of anything. Names leak in data breaches and get bought in bulk. Padlocks are free. And the domain is one character off — the kind of difference your eye is built to smooth over, especially on a small screen.

The check that always works: don't follow the link. Open the official app yourself, or type the address you already know. If there's a real problem with your account, it will be waiting for you there.`,

  rubric: {
    accept: [{ names: ["S1"] }, { anyOf: ["S2", "S3", "S4", "S5"], min: 2 }],
    partial: [{ anyOf: ["S2", "S3", "S4", "S5"], min: 1, andNot: ["S1"] }],
    bonusAdvanced: ["S5", "S6"],
    rejectOnDistractor: true,
    feedbackConstraints: [
      "When PARTIAL: name the signals they did get, then introduce exactly one they missed, highest weight first. Never list all of them — that's a lecture, not feedback.",
    ],
  },

  distractors: [
    {
      claim: "It has bad spelling/grammar",
      correction:
        "It doesn't. Modern phishing is clean. Teaching spelling as the tell makes learners more vulnerable to polished attacks.",
    },
    {
      claim: "It came from an unknown number",
      correction:
        "It displays a brand name, not a number. That's the deception, not a tell.",
    },
    {
      claim: "There's no padlock so it's not secure",
      correction:
        "There is a padlock. If a learner says this they've misread the screen; correct it gently.",
    },
    {
      claim: "Real companies don't send SMS",
      correction: "They do, constantly. Wrong lesson.",
    },
  ],

  reveal: {
    headline: "This exact technique has a name.",
    body: "Swapping `rn` for `m`, or adding a word like `-verify`, produces a domain your eye reads as correct — a trick that works especially well on phones, where the address bar is short and the font is small.",
    sourceLinks: [
      "https://developer.mozilla.org/en-US/docs/Web/Security",
      "Any consumer-protection explainer on typosquatting and homoglyph domains",
    ],
  },

  call_script: null,
  content_warning: false,
  content_warning_text: null,
  skippable_without_penalty: false,
  sequence_order: 1,
};

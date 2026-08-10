// MODULE 09 — "The Payment Didn't Go Through" (Collect-Request Reversal)
//
// The third interaction type. Every other module asks the learner to evaluate
// a STORY. This one asks them to read a SCREEN — the app states, in its own
// words, that money is about to leave the account. The action IS the answer.
//
// It also flips the learner's role: here they are the SELLER, the one being
// paid. Nobody teaches you that being paid is an attack surface.
import type { AuthoredModule } from "@/types/modules";

export const m09: AuthoredModule = {
  slug: "collect-request-reversal",
  title: "The Payment Didn't Go Through",
  verdict: "fake",
  difficulty: 4,
  format: "interactive_payment_screen",
  est_seconds: 150,
  tags: ["payment_fraud", "ui_literacy", "direction_of_flow"],

  prompt_text: `You're selling at your stall. A customer scans your code to pay, then says the payment failed and he's sending it a different way. Your phone buzzes.

**Read your screen carefully before you decide.**`,
  question_variant: null,
  // Was Real/Scam. Standardized with the rest of the set.
  verdict_labels: { positive: "Real", negative: "Fake" },

  render_spec: {
    engine: "action_flow",
    frame: "phone",
    safety: [
      "Fictional payment app. Match the LAYOUT of real payment apps; invent the name and mark.",
      "The PIN pad is a component with local state. It authorizes nothing and posts nowhere.",
      "Do not punish the learner for tapping PAY. The point of a simulation is that this is where it's safe to get it wrong.",
    ],
    screens: [
      {
        id: "conversation",
        kind: "stall_dialogue",
        advance: { via: "button", label: "Continue" },
        props: { illustration: "illus_stall", lines: 2 },
      },
      {
        id: "notification",
        kind: "lockscreen_banner",
        advance: { via: "notification_tap" },
        props: {
          // Deliberately ambiguous wording, because the real notifications
          // are ambiguous, and that ambiguity is the scam's actual mechanism.
          ambiguous: true,
        },
      },
      {
        id: "authorization",
        kind: "payment_authorization",
        advance: { via: "choice" },
        props: {
          // All legible, none hidden. The app is telling the truth.
          showsRequestingFromYou: true,
          showsPayingFrom: true,
          showsOwnAccountNumber: "••••4471",
          // This is how the real screens look, and it is a genuine design
          // failure worth naming. Signal S7.
          payButton: { label: "PAY", primary: true, color: "green", size: "large" },
          declineButton: { label: "DECLINE", primary: false, color: "grey", size: "small" },
        },
      },
    ],
  },

  assets: [
    {
      slot: "pay_app_ui",
      what: "The three screens",
      source: "Build in-app, fictional brand",
      license: "Ours",
    },
    {
      slot: "illus_stall",
      what: "Simple stall scene",
      source: "Illustration, not photo",
      license: "Ours",
      note: "Illustration avoids depicting a real vendor as a scam victim.",
    },
    {
      slot: "sfx_notification",
      what: "Notification chime",
      source: "Freesound (CC0)",
      license: "CC0",
    },
  ],

  content_blocks: {
    customer_line_1: "It's showing error on my side. Money's stuck.",
    customer_line_2:
      "I'm sending a request, just clear it from your side and it'll come through. One second only.",
    notification: "{{CUSTOMER_NAME}} sent you a payment request · Tap to view",
    authorization: {
      app: "{{PAY_APP}}",
      requester: "{{CUSTOMER_NAME}}",
      direction_label: "requesting from you",
      amount: "{{AMOUNT}}",
      paying_from_label: "Paying from:",
      account: "{{BANK}} ••••4471",
      // The sharpest touch. Scammers write reassuring text into the one
      // free-text field the app gives them, and it appears on the
      // authorization screen looking like part of the app's own interface.
      note: "payment failed clearing",
      buttons: ["DECLINE", "PAY"],
    },
  },

  signals: [
    {
      id: "S1",
      signal:
        "You never enter your PIN to receive money. Your PIN is entered only when you make a payment, never when you receive one",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      note: "One rule, covers every version of this scam forever. Sufficient alone for full credit.",
      short:
        "You never enter your PIN to receive money. Your PIN authorizes money leaving your account — that is all it does. Receiving is passive.",
      cues: [
        "pin",
        "never enter",
        "dont enter",
        "do not enter",
        "password",
        "to receive money",
        "receiving money",
        "authorise",
        "authorize",
        "approve",
        "only when paying",
      ],
    },
    {
      id: "S2",
      signal:
        'The screen says "requesting from you" and "Paying from" your account. The app is telling you the direction of the money. It\'s on screen. Read it',
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      short:
        "The screen says “requesting from you” and “Paying from” your own account. The app was stating the direction of the money the entire time.",
      cues: [
        "requesting from you",
        "paying from",
        "the screen said",
        "the screen says",
        "direction",
        "money leaving",
        "sending not receiving",
        "it was a request",
        "request not a payment",
        "my account",
        "read the screen",
      ],
    },
    {
      id: "S3",
      signal:
        'A "failed" payment is never fixed by the seller paying. If his payment failed, the money is still with him — nothing about that requires anything from you',
      weight: 3,
      polarity: "red_flag",
      tier: "expert",
      short:
        "A failed payment is never fixed by the seller paying. If it failed, the money is still with him — nothing about that needs anything from you.",
      cues: [
        "failed payment",
        "if it failed",
        "money is still with him",
        "still has the money",
        "doesnt make sense",
        "makes no sense",
        "why would i pay",
        "my paying doesnt fix",
        "nothing to do with me",
      ],
    },
    {
      id: "S4",
      signal:
        "He controls the whole story — you never saw the error he described. He says it failed; your account is the only thing that can confirm it",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
      short:
        "You never saw the error — you only heard about it. The only thing that can tell you whether money arrived is your own account.",
      cues: [
        "never saw",
        "didnt see the error",
        "only his word",
        "his story",
        "he said",
        "cant verify",
        "check my own account",
        "check my balance",
        "no proof",
      ],
    },
    {
      id: "S5",
      signal:
        'Manufactured hurry — "one second only," a queue behind him, keeping you off the screen',
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
      short:
        "Manufactured hurry — “one second only”, a queue behind him. The rush exists to keep you off your own screen.",
      cues: [
        "hurry",
        "rush",
        "rushing",
        "urgency",
        "one second",
        "pressure",
        "pressuring",
        "quickly",
        "no time to",
        "distract",
      ],
    },
    {
      id: "S6",
      signal: "Reassuring text in the note field written by him, not by the app",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
      short:
        "“Payment failed clearing” is text he typed into the note field. It appears on the screen looking like part of the app's own interface.",
      cues: [
        "note field",
        "the note",
        "he wrote",
        "typed by him",
        "not from the app",
        "message on the screen",
        "payment failed clearing",
      ],
    },
    {
      id: "S7",
      signal:
        "The safe button is the small grey one — the interface is nudging toward the loss",
      weight: 1,
      polarity: "red_flag",
      tier: "expert",
      short:
        "The safe button is the small grey one and the costly one is big and green. The interface is nudging you toward the loss.",
      cues: [
        "button",
        "buttons",
        "decline is small",
        "pay is big",
        "green button",
        "grey button",
        "design of the screen",
        "nudge",
      ],
    },
  ],

  canonical_reasoning: `This is a scam, and the proof was on your screen the whole time.

Here's the rule that ends every version of this, forever: **you never enter your PIN to receive money.** Your PIN authorizes money leaving your account. That's all it does. Receiving is passive — someone sends, it arrives, you do nothing. So any situation where you're being asked for your PIN in order to *get paid* has the direction of the money backwards, and there are no exceptions to check for.

Look at what the screen actually said. "Requesting from you." "Paying from — your bank, your account." Your own account number, right there. The app was not hiding anything. It was stating plainly that you were about to send money, and the reason it didn't register is that a person standing in front of you had already told you what the screen meant before you read it. That's the real technique here — not a fake screen, but a story planted in your head that overwrites what your eyes see.

And think about his story for one second. His payment failed. If it failed, the money never left him — it's still in his account. Nothing about a failure on his side needs anything from your side. There is no mechanism by which you paying fixes his payment. The sentence sounds procedural and means nothing.

Notice also that you never saw the error. You only heard about it. The only thing that can tell you whether money arrived is your own account — not his screen, not his description, not a screenshot he shows you.

Two things to keep. **One:** PIN means paying, always, no exceptions. **Two:** read the screen your own app is showing you *before* you touch anything, especially when someone is talking while you do it. The talking is the attack.

And this isn't about being bad with technology. This scam works on people who use these apps forty times a day — because it doesn't target your knowledge, it targets the two seconds when you're being helpful and someone else is narrating your screen for you.`,

  rubric: {
    accept: [
      { anyOf: ["S1", "S2"], min: 1 },
      { anyOf: ["S3", "S4", "S5", "S6"], min: 2 },
    ],
    partial: [
      { anyOf: ["S3", "S4", "S5", "S6", "S7"], min: 1, andNot: ["S1", "S2"] },
    ],
    bonusAdvanced: ["S3"],
    sufficientAlone: ["S1"],
    feedbackConstraints: [
      'S1 alone is full credit. "You never enter a PIN to receive money" is the complete and correct answer.',
      "The closing note is not optional: the victims of this scam are frequently older or less confident with English-language interfaces. A module that lands as 'don't be like that vendor' teaches contempt instead of skill. The vulnerability is SOCIAL, not technical.",
      "No shaming if they entered the PIN. 'This is the exact moment it happens. It just happened somewhere safe.'",
    ],
    feedback: {
      strongest:
        "You never enter your PIN to receive money. Your PIN authorizes money leaving your account — that is the only thing it does. Receiving is passive: someone sends, it arrives, you do nothing. So any situation where you're asked for your PIN in order to get paid has the direction of the money backwards, and there are no exceptions to check for.",
      takeaway:
        "PIN means paying, always. And read the screen your own app is showing you before you touch anything — especially when someone is talking while you do it. The talking is the attack.",
      wrongVerdictNote:
        "This isn't about being bad with technology — it works on people who use these apps forty times a day. It targets the two seconds when you're being helpful and someone else is narrating your screen for you.",
    },
  },

  distractors: [
    {
      claim: "He looked suspicious / was too well-dressed",
      correction:
        "He was well-dressed on purpose, and how someone looks is never evidence. Worth pushing back on hard: that instinct will have you trusting the smart ones and suspecting your ordinary customers.",
      cues: [
        "looked suspicious",
        "well dressed",
        "his appearance",
        "the way he looked",
        "shifty",
        "dodgy looking",
        "seemed like a",
      ],
    },
    {
      claim: "QR codes are dangerous",
      correction:
        "The QR code was fine — it's your own code, doing what it's for. Becoming afraid of the technology is the wrong lesson; the thing to watch is the direction of the money.",
      cues: [
        "qr code",
        "qr codes are",
        "scanning is dangerous",
        "dont scan",
        "the code was",
      ],
    },
    {
      claim: "The vendor should have known English",
      correction:
        "This works on fluent English speakers just as reliably. The vulnerability here is social, not linguistic — someone friendly talking over you while you read.",
      cues: [
        "should have known english",
        "didnt understand english",
        "language barrier",
        "couldnt read english",
        "his english",
      ],
    },
    {
      claim: "He should have just used cash",
      correction:
        "Avoiding the tool isn't the same as knowing how to use it. A stall that takes cash only loses customers, and the rule you actually need takes one sentence.",
      cues: [
        "should have used cash",
        "just use cash",
        "cash only",
        "avoid these apps",
        "shouldnt use the app",
      ],
    },
  ],

  reveal: {
    headline: "One rule protects you from every version of this.",
    body: "Payment systems that support pull requests — where someone can ask you for money and you approve it — all carry this risk, because approving a request and receiving a payment look similar in a notification. The rule is absolute: you never need to enter your PIN or approve any request to *receive* money. Official guidance states the PIN is entered only when making a payment, never when receiving one.\n\nDocumented variants all run on the same mechanic: a seller asked to scan a code to \"receive\" payment who lost the money instead, and a \"prize winner\" told to approve a request to claim winnings. National payment guidance also warns to check the recipient's name on screen before transferring, and notes that fraudsters pressure users to act quickly — pausing to verify is always acceptable.",
    localizationNote:
      "India pack: UPI, real app names in the reveal text only, helpline 1930. The mechanic is not India-specific — pull/collect requests exist in many systems worldwide.",
  },

  call_script: null,
  content_warning: false,
  content_warning_text: null,
  skippable_without_penalty: false,
  sequence_order: 8,
};

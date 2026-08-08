// MODULE 03 — The Incoming Call (Authority Impersonation) — INTERACTIVE
//
// First of two modules on the shared interactive-call engine. Module 08 is the
// same component with a different call_script. Build the engine once.
import type { AuthoredModule } from "@/types/modules";

export const m03: AuthoredModule = {
  slug: "voip-customs-impersonation",
  title: "The Incoming Call",
  verdict: "fake",
  difficulty: 4,
  format: "interactive_call",
  est_seconds: 180,
  tags: ["vishing", "authority", "interactive", "ai_driven"],

  prompt_text:
    "Put your phone down on the table. Tap when you're ready.",
  question_variant: null,
  verdict_labels: { positive: "Real", negative: "Fake" },

  render_spec: {
    engine: "interactive_call",
    frame: "phone",
    safety: [
      "Browsers block autoplay audio. The arming tap IS the user gesture that unlocks the audio context — unlock inside that handler.",
      "iOS Safari blocks Web Audio entirely when the ringer is on silent. Detect and show a 'turn your ringer on' hint.",
      "navigator.vibrate() works on Android Chrome and not at all on iOS Safari. Feature-detect, don't assume.",
      "The End-call button is present and functional from second one. A learner who hangs up early did the correct thing and must be told so.",
    ],
    screens: [
      {
        id: "arming",
        kind: "lock_screen",
        advance: { via: "button", label: "Tap when you're ready" },
        props: {
          // The pause is what makes it land.
          pauseBeforeRingSeconds: [3, 6],
          unlocksAudio: true,
        },
      },
      {
        id: "ring",
        kind: "incoming_call",
        advance: { via: "choice" },
        props: {
          fullBleedDark: true,
          acceptDeclineSize: 72,
          vibratePattern: [500, 300, 500],
          loopRingtone: true,
        },
      },
      {
        id: "connected",
        kind: "call_connected",
        props: {
          videoLoopPercent: 60,
          showTimer: true,
          watermark: "{{VOIP_APP_NAME}}",
          endCallAlwaysVisible: true,
          // Real VoIP calls are imperfect; perfection breaks immersion.
          connectionArtifacts: { freezeMs: 400, audioDelayMs: 120 },
        },
      },
    ],
  },

  assets: [
    {
      slot: "ringtone",
      what: "4–6s loopable ring",
      source: "Pixabay / Freesound (CC0)",
      license: "CC0",
      note: "Don't use a real carrier's ringtone — trademarked.",
    },
    {
      slot: "video_caller",
      what: "8–10s loop, head & shoulders, listening",
      source: "Film it yourself — a teammate, plain wall, lanyard, phone camera",
      license: "Ours",
      note: "Best option by far. Free, consent-clean, and a real human face makes the 'he looked official' lesson land in a way stock footage can't.",
    },
    {
      slot: "badge_prop",
      what: "Lanyard ID card visible on camera",
      source: "Print a fake one with {{CUSTOMS_AUTHORITY_NAME}}",
      license: "Ours",
      note: "Deliberately slightly blurry — real ones never scan clean.",
    },
    {
      slot: "audio_lines",
      what: "Caller's spoken script",
      source: "Record a teammate, or TTS",
      license: "Ours",
      note: "Human recording beats TTS.",
    },
    {
      slot: "sfx_office",
      what: "Low office ambience under the voice",
      source: "Freesound (CC0)",
      license: "CC0",
    },
  ],

  content_blocks: {
    ring_header: "{{VOIP_APP_NAME}} Video Call",
    caller_name: "{{CUSTOMS_AUTHORITY_NAME}}",
    caller_number: "+{{FOREIGN_COUNTRY_CODE}} {{NUMBER}}",
    turn_2_ask:
      "To release the parcel I need two things. First, hold your ID up to the camera so I can verify. Second, there's an administrative clearance fee of {{AMOUNT}} — this is standard, it's refundable once the case closes. If we don't process this today the file transfers automatically to law enforcement and I can't help you after that.",
  },

  signals: [
    {
      id: "S1",
      signal:
        "Arrived via a free internet-calling app, not an official line — any name and number can be displayed for free",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S2",
      signal:
        "Demands payment during the call — no real customs or courier process works this way",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S3",
      signal: "Threatens law enforcement to force immediate compliance",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S4",
      signal:
        "Won't provide a callback number — refuses any independently verifiable detail",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S5",
      signal:
        "Asks for ID on camera — an identity document is a credential, not a verification method",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
    },
    {
      id: "S6",
      signal: "Absorbs every objection instead of engaging with it",
      weight: 2,
      polarity: "red_flag",
      tier: "expert",
      note: "Hardest signal in the set.",
    },
    {
      id: "S7",
      signal:
        "Badge, uniform, and office noise are props — visual authority is the cheapest thing to fake",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
    },
    {
      id: "S8",
      signal:
        "Unexplained foreign country code for a supposedly domestic process",
      weight: 1,
      polarity: "red_flag",
      tier: "expert",
    },
  ],

  canonical_reasoning: `This is fake, and the reason it's frightening is that almost everything about it is designed to make you not want to hang up.

Start with how it arrived. A free internet-calling app lets anyone display any name, any number, any country. The badge on camera, the office noise behind him, the case number — all of it costs nothing. Authority is the cheapest thing in the world to counterfeit, and this call is made almost entirely out of it.

Then look at what he actually asks for: money, now, and your ID. No customs office, courier, or police force anywhere resolves a case by taking a payment over a video call. That's not a procedural detail — it's the whole thing. Real institutions send letters, use case numbers you can check, and let you call them back on a number you looked up yourself.

Which is the test that never fails. Ask for a number and call it back. He won't give you one, because the moment you hang up and dial an official number, the story collapses. Every deflection he makes is protecting that.

And notice what happened each time you pushed back. He didn't argue. He agreed with you and turned your doubt into another reason to comply — "that's exactly why we need to verify." You cannot reason your way out of this conversation, because it isn't a conversation. It's a script that treats your resistance as an input.

So the skill here isn't spotting the lie. It's knowing that you're allowed to hang up on someone who sounds official, before you're sure. You can always call back. You can never un-send a payment.`,

  rubric: {
    accept: [
      { anyOf: ["S2", "S4"], min: 1 },
      { anyOf: ["S1", "S3", "S5", "S6", "S7"], min: 2 },
    ],
    partial: [
      { anyOf: ["S1", "S3", "S5", "S7"], min: 1, andNot: ["S2", "S4"] },
    ],
    bonusAdvanced: ["S6"],
    feedbackConstraints: [
      "Behavioural score is separate from reasoning score. Log what the learner did and grade it independently.",
      "Never shame a learner who complied. 'This works on people who know better. That's why it's still running.'",
    ],
  },

  distractors: [
    {
      claim: "His English/accent was wrong",
      correction:
        "Irrelevant and edges into prejudice. Do not credit under any circumstances.",
    },
    {
      claim: "The video looked fake",
      correction:
        "It was deliberately made to look real. If they say this they're guessing.",
    },
    {
      claim: "Real officials don't use video calls",
      correction:
        "Increasingly they do. The tell is the free app and the payment demand, not the medium.",
    },
  ],

  reveal: {
    headline: "This is the fastest-growing scam category in the world.",
    body: "Voice phishing is now the second most common way attacks begin, and over $200 million was lost to deepfake voice scams in a single quarter of 2025. Enterprises pay for simulations exactly like this one. You just did it for free.",
  },

  call_script: {
    armingCopy: "Put your phone down on the table. Tap when you're ready.",
    ring: {
      appLabel: "{{VOIP_APP_NAME}} Video Call",
      callerName: "{{CUSTOMS_AUTHORITY_NAME}}",
      callerNumber: "+{{FOREIGN_COUNTRY_CODE}} {{NUMBER}}",
      avatar: "org_logo",
      // Discomfort is the lesson.
      ringSeconds: 12,
    },
    opening:
      "Good afternoon. Am I speaking with {{LEARNER_FIRST_NAME}}? This is Officer {{OFFICER_NAME}} from the {{CUSTOMS_AUTHORITY_NAME}}. I'm calling regarding a parcel addressed to you that has been intercepted at our facility. The contents are… I have to tell you, they're flagged as prohibited items. Do you have a moment? This is a serious matter.",
    turns: [
      {
        id: "turn_1",
        callerLine: "",
        options: [
          {
            id: "t1_a",
            label: "I'm not expecting a package.",
            type: "doubt",
            callerMove: "absorb_redirect",
            response:
              "That's very common in these cases, ma'am. Your identity may have been used by a third party. That's precisely why we need to verify who you are — otherwise the shipment stays attached to your name.",
          },
          {
            id: "t1_b",
            label: "What's in it?",
            type: "engaged",
            callerMove: "deflect_escalate",
            response:
              "I'm not permitted to read the full manifest to you, but the flagged items fall under prohibited substances. The case number is {{CASE_NUMBER}}. I should tell you that once this is logged, enforcement becomes involved automatically.",
          },
          {
            id: "t1_c",
            label:
              "Which office are you calling from? Give me a number and I'll call you back.",
            type: "verify",
            correct: true,
            callerMove: "deflect_escalate",
            // He never gives a callback number. That is the whole tell.
            response:
              "That won't be necessary, we can resolve this now. I have your file open in front of me. If we don't complete verification in this call it goes to the enforcement division.",
            logs: ["asked_for_callback_number"],
          },
          {
            id: "t1_d",
            label: "End call",
            type: "end_call",
            correct: true,
            terminal: true,
            logs: ["ended_call_before_turn_2"],
          },
        ],
      },
      {
        id: "turn_2",
        callerLine:
          "To release the parcel I need two things. First, hold your ID up to the camera so I can verify. Second, there's an administrative clearance fee of {{AMOUNT}} — this is standard, it's refundable once the case closes. If we don't process this today the file transfers automatically to law enforcement and I can't help you after that.",
        options: [
          {
            id: "t2_a",
            label: "Hold up my ID to the camera",
            type: "comply",
            callerMove: "time_pressure",
            response:
              "Thank you. Hold it steady… a little closer. Good. Now the clearance fee — I'll stay on the line while you send it.",
            logs: ["complied_with_id_or_payment"],
          },
          {
            id: "t2_b",
            label: "Pay the clearance fee",
            type: "comply",
            terminal: true,
            response:
              "Thank you, ma'am. The reference will come through shortly. Please remain available in case the department needs anything further.",
            logs: ["complied_with_id_or_payment"],
          },
          {
            id: "t2_c",
            label: "Send it to me in writing and I'll respond.",
            type: "verify",
            correct: true,
            callerMove: "time_pressure",
            response:
              "There isn't time for written correspondence. The file moves at end of day. I'm trying to help you here — after that it's out of my hands.",
            logs: ["asked_for_it_in_writing"],
          },
          {
            id: "t2_d",
            label: "End call",
            type: "end_call",
            correct: true,
            terminal: true,
            logs: ["ended_call"],
          },
        ],
      },
    ],
    // Hard stop: never let a learner get stuck.
    maxTurns: 4,
    maxSeconds: 180,
    behaviouralOutcomes: [
      {
        key: "ended_call_before_turn_2",
        feedback: "You did the right thing, and you did it fast.",
        positive: true,
      },
      {
        key: "asked_for_callback_number",
        feedback:
          "Asking for a callback number is the best possible play. A real official can always be called back — that request is what the whole script is built to avoid.",
        positive: true,
      },
      {
        key: "asked_for_it_in_writing",
        feedback:
          "Asking for it in writing is the right instinct — it moves the conversation somewhere you can check it.",
        positive: true,
      },
      {
        key: "complied_with_id_or_payment",
        feedback:
          "This works on people who know better. That's why it's still running.",
        positive: false,
      },
    ],
  },

  content_warning: false,
  content_warning_text: null,
  skippable_without_penalty: false,
  sequence_order: 4,
};

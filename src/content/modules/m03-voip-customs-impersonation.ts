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

  // The old copy told the learner to put their physical phone on the table and
  // turn their ringer on. The browser can't reach any of that — no incoming
  // call arrives on the device, and on iOS the ringer switch silences Web Audio
  // entirely — so the instruction promised something the experience never
  // delivered, and the gap was the first thing that broke the illusion. The
  // simulation now claims only what it can do, and does that convincingly.
  prompt_text:
    "In a moment, a call comes in. Take it the way you'd take a real one — and remember you can end it whenever you want.",
  question_variant: null,
  verdict_labels: { positive: "Real", negative: "Fake" },

  render_spec: {
    engine: "interactive_call",
    frame: "phone",
    safety: [
      "Browsers block autoplay audio. The arming tap IS the user gesture that unlocks the audio context — unlock inside that handler.",
      "Audio may be unavailable (iOS ringer switch, muted tab, no Web Audio). The simulation must be complete without it: ring state, timer, transitions and video carry the experience on their own. Never instruct the learner to change a physical device setting.",
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
      short:
        "The call arrived through a free internet-calling app. Any name, any number, any country can be displayed on one of those for nothing.",
      cues: [
        "internet call",
        "calling app",
        "voip",
        "whatsapp",
        "app call",
        "not an official line",
        "official line",
        "spoof",
        "caller id",
        "any number",
        "free app",
        "the app it came",
        "video call app",
      ],
    },
    {
      id: "S2",
      signal:
        "Demands payment during the call — no real customs or courier process works this way",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      short:
        "He asks for money during the call. No customs office, courier or police force anywhere settles a case by taking a payment over a video call.",
      cues: [
        "pay",
        "payment",
        "fee",
        "money",
        "clearance",
        "asked me to pay",
        "wants money",
        "transfer",
        "charge",
        "cash",
      ],
    },
    {
      id: "S3",
      signal: "Threatens law enforcement to force immediate compliance",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      short:
        "He threatens law enforcement to make you act immediately. Fear is the mechanism here, not a procedural detail.",
      cues: [
        "threat",
        "threaten",
        "law enforcement",
        "police",
        "arrest",
        "enforcement",
        "consequences",
        "scare",
        "scared",
        "fear",
        "legal action",
        "court",
        "prison",
        "jail",
      ],
    },
    {
      id: "S4",
      signal:
        "Won't provide a callback number — refuses any independently verifiable detail",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      short:
        "He won't give you a number to call back on. That one request is what the entire script is built to avoid.",
      cues: [
        "callback",
        "call back",
        "call him back",
        "number to call",
        "wouldnt give",
        "would not give",
        "refused to give",
        "no number",
        "verify",
        "verifiable",
        "check independently",
        "ring back",
        "couldnt check",
        "in writing",
        "nothing i could check",
      ],
    },
    {
      id: "S5",
      signal:
        "Asks for ID on camera — an identity document is a credential, not a verification method",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
      short:
        "He asks for your ID on camera. An identity document is a credential — showing it doesn't verify you to anyone, it hands something over.",
      cues: [
        "id",
        "identity document",
        "hold up my id",
        "show my id",
        "passport",
        "document on camera",
        "identification",
        "personal details",
      ],
    },
    {
      id: "S6",
      signal: "Absorbs every objection instead of engaging with it",
      weight: 2,
      polarity: "red_flag",
      tier: "expert",
      note: "Hardest signal in the set.",
      short:
        "Every objection gets agreed with and folded back into the story. It isn't a conversation — it's a script that treats your doubt as an input.",
      cues: [
        "every objection",
        "whatever i said",
        "no matter what",
        "turned it around",
        "always had an answer",
        "agreed with me",
        "never answered",
        "couldnt argue",
        "deflect",
        "avoided the question",
        "script",
        "rehearsed",
      ],
    },
    {
      id: "S7",
      signal:
        "Badge, uniform, and office noise are props — visual authority is the cheapest thing to fake",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
      short:
        "Badge, uniform, office noise, case number. Visual authority is the cheapest thing in the world to counterfeit.",
      cues: [
        "badge",
        "uniform",
        "lanyard",
        "looked official",
        "sounded official",
        "authority",
        "props",
        "case number",
        "office",
        "official looking",
      ],
    },
    {
      id: "S8",
      signal:
        "Unexplained foreign country code for a supposedly domestic process",
      weight: 1,
      polarity: "red_flag",
      tier: "expert",
      short:
        "A foreign country code, unexplained, for a process that is supposed to be happening in your own country.",
      cues: [
        "country code",
        "foreign number",
        "international number",
        "abroad",
        "different country",
        "overseas",
        "not a local number",
      ],
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
    feedback: {
      strongest:
        "He would not give you a number to call him back on. That is the test that never fails: a real official can always be called back, because being checkable is what makes them official. Every deflection in this call is protecting that one point — the moment you hang up and dial a number you looked up yourself, the story has nowhere left to go.",
      takeaway:
        "You are allowed to hang up on someone who sounds official, before you are sure. You can always call back on a number you found yourself. You can never un-send a payment.",
      wrongVerdictNote:
        "Almost everything in this call is engineered to make hanging up feel rude or risky — the badge, the calm voice, the case number, the warning about what happens if you don't cooperate. That's the product working, not a lapse on your part.",
    },
  },

  distractors: [
    {
      claim: "His English/accent was wrong",
      correction:
        "How someone speaks tells you nothing about whether they're lying, and treating an accent as evidence will make you wrong in both directions — trusting fluent scammers and suspecting honest people. The tell here was the payment demand, not the voice.",
      cues: [
        "accent",
        "his english",
        "broken english",
        "speak english",
        "sounded foreign",
        "way he talked",
        "grammar",
      ],
    },
    {
      claim: "The video looked fake",
      correction:
        "The video was made to look ordinary, and it is — a person on a low-bandwidth call. If the picture had been sharper, nothing about the call would have been safer.",
      cues: [
        "video looked fake",
        "video was fake",
        "looked fake",
        "deepfake",
        "ai generated",
        "not a real person",
        "cgi",
        "the picture looked",
      ],
    },
    {
      claim: "Real officials don't use video calls",
      correction:
        "Increasingly they do, so this rule will fail you soon. The tell isn't the medium — it's the free calling app, the refusal to be called back, and the payment.",
      cues: [
        "officials dont use video",
        "dont do video calls",
        "police dont call",
        "wouldnt call on video",
        "never video call",
        "they dont call you",
      ],
    },
  ],

  reveal: {
    headline: "This is the fastest-growing scam category in the world.",
    body: "Voice phishing is now the second most common way attacks begin, and over $200 million was lost to deepfake voice scams in a single quarter of 2025. Enterprises pay for simulations exactly like this one. You just did it for free.",
  },

  call_script: {
    armingCopy:
      "A call is about to come in. It's a simulation — nothing dials your phone, nothing is recorded, and you can end it at any moment.",
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
            logs: ["questioned_caller", "denied_expecting_parcel"],
          },
          {
            id: "t1_b",
            label: "What's in it?",
            type: "engaged",
            callerMove: "deflect_escalate",
            response:
              "I'm not permitted to read the full manifest to you, but the flagged items fall under prohibited substances. The case number is {{CASE_NUMBER}}. I should tell you that once this is logged, enforcement becomes involved automatically.",
            logs: ["questioned_caller", "asked_what_package_contains"],
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
            logs: ["questioned_caller", "asked_for_callback_number"],
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
            logs: ["complied_with_id_or_payment", "showed_id"],
          },
          {
            id: "t2_b",
            label: "Pay the clearance fee",
            type: "comply",
            terminal: true,
            response:
              "Thank you, ma'am. The reference will come through shortly. Please remain available in case the department needs anything further.",
            logs: ["complied_with_id_or_payment", "sent_payment"],
          },
          {
            id: "t2_c",
            label: "Send it to me in writing and I'll respond.",
            type: "verify",
            correct: true,
            callerMove: "time_pressure",
            response:
              "There isn't time for written correspondence. The file moves at end of day. I'm trying to help you here — after that it's out of my hands.",
            logs: ["questioned_caller", "asked_for_it_in_writing"],
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
    // Order is display order, and the composer shows the first three. Most
    // instructive first: what the learner did that was decisive, then what they
    // did that was reasonable, then where they ended up.
    behaviouralOutcomes: [
      {
        key: "asked_for_callback_number",
        feedback:
          "You asked for a callback number — the single best move available in this call. Notice you never got one. A real official can always be called back, and that request is what the whole script exists to avoid.",
        positive: true,
      },
      {
        key: "asked_for_it_in_writing",
        feedback:
          "You asked for it in writing. Right instinct: it moves the conversation somewhere you can check at your own speed, which is why he refused.",
        positive: true,
      },
      {
        key: "declined_call",
        feedback:
          "You didn't answer at all. That is a completely legitimate move — an unknown number has no claim on your attention, and anyone with real business will leave a message or write to you.",
        positive: true,
      },
      {
        key: "ended_call_before_turn_2",
        feedback:
          "You hung up in the first few seconds. That was the correct move, and you made it before you had proof — which is the part most people find hardest.",
        positive: true,
      },
      {
        key: "showed_id",
        feedback:
          "You held your ID up to the camera. Worth knowing what that actually is: an identity document is a credential, so showing it doesn't verify you to anyone — it hands something over. Nothing was captured here.",
        positive: false,
      },
      {
        key: "sent_payment",
        feedback:
          "You paid the clearance fee. This works on people who know better, which is why it's still running and why doing it here rather than on a real call is the entire point.",
        positive: false,
      },
      {
        key: "asked_what_package_contains",
        feedback:
          "You asked what was in the parcel. Fair question — and look at what came back: no manifest, no detail you could check, just a case number and a warning about enforcement.",
        positive: true,
      },
      {
        key: "denied_expecting_parcel",
        feedback:
          "You told him you weren't expecting anything. Watch what he did with that: he agreed with you, and turned it into another reason you had to keep talking.",
        positive: true,
      },
      {
        key: "reached_payment_request",
        feedback:
          "You stayed on the line until the money came up. Worth knowing about yourself — most people do, because leaving feels rude long after it stops feeling safe.",
        positive: false,
      },
      {
        key: "ended_call",
        feedback: "You ended the call. That option was there the whole time, and taking it is always available to you.",
        positive: true,
      },
    ],
  },

  content_warning: false,
  content_warning_text: null,
  skippable_without_penalty: false,
  sequence_order: 4,
};

// MODULE 08 — The Call About Your Son (Digital Arrest) — INTERACTIVE
//
// Second module on the shared call engine. Structurally different from 03 in
// the way that matters: the learner is not the accused, someone they love is.
// You can't verify by checking your own records, your instinct to protect
// overrides your instinct to check, and the scammer's core move is making sure
// you can't reach the person the story is about.
import type { AuthoredModule } from "@/types/modules";

export const m08: AuthoredModule = {
  slug: "digital-arrest-family-variant",
  title: "The Call About Your Son",
  verdict: "fake",
  difficulty: 5,
  format: "interactive_call",
  est_seconds: 200,
  tags: ["digital_arrest", "authority", "emotional_coercion", "interactive"],

  prompt_text:
    "Put your phone down on the table. Tap when you're ready.",
  question_variant: null,
  verdict_labels: { positive: "Real", negative: "Fake" },

  render_spec: {
    engine: "interactive_call",
    frame: "phone",
    safety: [
      "This module induces real fear. That is what makes it work and it is also a duty of care.",
      "The pre-module content warning is mandatory and must offer Continue / Skip this module.",
      "Skipping must not penalize progress or mentor eligibility (skippable_without_penalty).",
      "The exit button is visible and functional from second one.",
      "The reveal comes FAST. Do not let a learner sit in the fear — the moment the call ends, the 'this was a simulation, here's what would have ended it in ten seconds' panel appears.",
      "Do not use a real law enforcement emblem, uniform, or agency name anywhere in this module, in any language pack. Real agency names go in the reveal panel only, as citations.",
    ],
    screens: [
      {
        id: "arming",
        kind: "lock_screen",
        advance: { via: "button", label: "Tap when you're ready" },
        props: { pauseBeforeRingSeconds: [3, 6], unlocksAudio: true },
      },
      {
        id: "ring",
        kind: "incoming_call",
        advance: { via: "choice" },
        props: {
          fullBleedDark: true,
          // Unfamiliar foreign country code, no saved contact name.
          showCallerNameAsNumber: true,
          avatar: "silhouette",
          vibratePattern: [500, 300, 500],
        },
      },
      {
        id: "connected",
        kind: "call_connected",
        props: {
          videoLoopPercent: 60,
          showTimer: true,
          endCallAlwaysVisible: true,
          // Deliberately a little too centered and too still — should feel
          // staged in retrospect without being obvious live.
          staged: true,
          pressureBanner: "DO NOT DISCONNECT — CALL IS BEING RECORDED",
        },
      },
    ],
  },

  assets: [
    {
      slot: "video_officer_2",
      what: "Different person from Module 03 — seated, uniform-adjacent",
      source: "Film a second teammate",
      license: "Ours",
    },
    {
      slot: "emblem_prop",
      what: "Printed emblem on the wall behind",
      source: "Design a fictional one",
      license: "Ours",
      note: "Do NOT use a real police or government emblem. Impersonating a police force in a shipped artifact is a line not to go near for a UNESCO submission.",
    },
    {
      slot: "sfx_station",
      what: "Background: phones, radio chatter",
      source: "Freesound (CC0)",
      license: "CC0",
    },
    {
      slot: "ringtone",
      what: "Reused from Module 03",
      source: "Pixabay / Freesound (CC0)",
      license: "CC0",
    },
  ],

  content_blocks: {
    ring_header: "WhatsApp Video Call",
    caller_number: "+{{FOREIGN_CODE}} {{NUMBER}}",
    pressure_banner: "DO NOT DISCONNECT — CALL IS BEING RECORDED",
    turn_2_ask:
      "There is a way to handle this before it goes into the system. If the case is filed tonight it stays on his record permanently — university, visa, everything. I can hold the paperwork until morning. The bail deposit is {{AMOUNT}}, transferred now, refundable when he's released. But it has to be now, ma'am, and it has to be you. Do not discuss this with anyone or I cannot protect him.",
  },

  signals: [
    {
      id: "S1",
      signal:
        '"Don\'t tell anyone / don\'t disconnect" — isolation. No real process requires your silence',
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
      note: "Generalizes far beyond scams. Police let you call a lawyer. Courts operate in public. Anyone whose story requires your silence has a story that doesn't survive being told to a second person.",
    },
    {
      id: "S2",
      signal:
        "Won't let you speak to your child, and blocks every route to reaching them",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S3",
      signal:
        "Payment to make a legal problem disappear — that isn't bail, that's a bribe, and no real officer would ask for it on a video call",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S4",
      signal:
        "Arrived on a messaging app from an unknown foreign number, not an official line",
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S5",
      signal:
        '"Digital arrest" is not a real thing. Such arrests do not exist in law — no legal system detains anyone through a video call',
      weight: 3,
      polarity: "red_flag",
      tier: "primary",
    },
    {
      id: "S6",
      signal:
        'Time pressure tied to permanent consequences — "on his record forever, unless tonight"',
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
    },
    {
      id: "S7",
      signal:
        "They knew your child's name and college — from a leaked list, not from having him. Knowing details is not proof of custody",
      weight: 3,
      polarity: "red_flag",
      tier: "expert",
      note: "The one that saves people. Everything else is theatre; the knowledge of your child's name is what makes the theatre land. Leaked school and college lists are cheap.",
    },
    {
      id: "S8",
      signal: "Uniform, emblem, background noise are props",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
    },
    {
      id: "S9",
      signal: "Muffled distressed voice you can't actually identify",
      weight: 2,
      polarity: "red_flag",
      tier: "advanced",
    },
  ],

  canonical_reasoning: `This is fake — and it's built specifically to defeat someone who would never fall for a scam aimed at themselves.

Start with the one that ends it in ten seconds. **They will not let you speak to your son, and they will not let you call anyone.** Every branch of that call, no matter what you say, protects one thing: your inability to check. His phone is seized. Contacting people is obstruction. Don't tell your husband. Don't disconnect.

That's not how any real process works. Police let people call a lawyer. Courts are public. There is no legal procedure anywhere on earth that depends on you keeping it secret — and an instruction to stay quiet is the single most reliable sign that a story cannot survive a second person hearing it.

There is also no such thing as a digital arrest. Nobody is detained by video call, in any legal system. The uniform, the emblem on the wall, the radio noise, the second officer who joins to back him up — all of it is set dressing, and set dressing is cheap.

Then the ask. Money, tonight, to stop a case being filed. That's not bail. That's a bribe — and if this man were really a police officer, what he just proposed on a recorded call would be a crime.

Now the part that actually fools people: **he knew your son's name, and his college.** That feels like proof, and it's the reason the fear lands so fast. But student lists leak constantly, and in real documented cases parents of several children from the same class all got called the same afternoon. Knowing your child's name proves someone bought a list. It proves nothing about where your child is.

Which points at the only thing you ever need to do: **hang up and call your son.** Not the number they give you — his number, the one already in your phone. In the real cases, that took seconds, and the students were sitting in class the whole time.

And decide this now, before it ever happens: agree a word with your family that only you know. If a call like this ever comes, ask for the word. No scammer on earth has it.`,

  rubric: {
    accept: [
      { anyOf: ["S1", "S2", "S5", "S7"], min: 1 },
      { anyOf: ["S3", "S4", "S6", "S8", "S9"], min: 2 },
    ],
    partial: [
      {
        anyOf: ["S3", "S4", "S6", "S8", "S9"],
        min: 1,
        andNot: ["S1", "S2", "S5", "S7"],
      },
    ],
    bonusAdvanced: ["S7"],
    feedbackConstraints: [
      "Absolutely no shaming on the comply branch. This scam has taken enormous sums from careful, intelligent people. 'It's designed to bypass judgment with fear. That's why it works, and that's why you practise it here first.'",
      "Feedback must close on the CONCRETE ACTION, not the analysis: 'hang up and call them directly' and 'agree a family code word'. Lead with those — they're what a learner should still remember in a year.",
    ],
  },

  distractors: [
    {
      claim: "The number was foreign so it's obviously fake",
      correction:
        "Helpful but weak alone; numbers are spoofable and some real calls are international.",
    },
    {
      claim: "The video looked fake",
      correction: "Deliberately made to look real.",
    },
    {
      claim: "My son would have called me himself",
      correction:
        "Comforting and unreliable; the scam is timed to when he can't answer.",
    },
    {
      claim: "Police don't make video calls",
      correction:
        "Increasingly they do. The tells are the payment, the isolation, and the refusal to let you verify.",
    },
  ],

  reveal: {
    headline: "In the real cases, one phone call ended it.",
    body: "When parents in one Indian city received these calls, immediate verification showed the students were safe at school the whole time. In another, parents of several children in the same class were called the same day — police concluded the students' details had been leaked.\n\nThe scale is not small. India's cybercrime coordination centre recorded roughly ₹2,140 crore lost to this scam between January and October 2024, and the Prime Minister raised it in a national radio address that October. More than 92,000 cases were reported in the first ten months of 2024 alone. There is no concept of digital arrest under Indian law, and legitimate authorities do not demand payment over calls to avoid arrest.",
    localizationNote:
      "India pack: surface cyber helpline 1930 and the National Cyber Crime Reporting Portal in the reveal. A learner who knows where to report is worth more than one who only knows to hang up.",
  },

  call_script: {
    armingCopy: "Put your phone down on the table. Tap when you're ready.",
    ring: {
      appLabel: "WhatsApp Video Call",
      callerName: "+{{FOREIGN_CODE}} {{NUMBER}}",
      callerNumber: "+{{FOREIGN_CODE}} {{NUMBER}}",
      avatar: "silhouette",
      ringSeconds: 12,
    },
    opening:
      "Am I speaking with the parent of {{CHILD_NAME}}? … Ma'am, I am calling from {{AGENCY_NAME}}. Your son has been detained. He was picked up this afternoon with four other boys — there is a case registered. I need you to stay calm and stay on this call. Do not disconnect. This call is being recorded as part of the case file.",
    pressureBanner: "DO NOT DISCONNECT — CALL IS BEING RECORDED",
    turns: [
      {
        id: "turn_1",
        callerLine: "",
        options: [
          {
            id: "t1_a",
            label: "Let me speak to him.",
            type: "doubt",
            callerMove: "deflect_escalate",
            response:
              "He is in processing, ma'am, I cannot put him on. … One moment. [muffled audio of a young man's voice, indistinct, upset — never clear enough to identify] That's all I can do right now.",
          },
          {
            id: "t1_b",
            label: "What is he accused of?",
            type: "engaged",
            callerMove: "deflect_escalate",
            response:
              "It is a serious matter, ma'am. Case number {{CASE_NUMBER}}. I am not able to discuss the specifics on an open line, but I will tell you the other boys' families are already cooperating.",
          },
          {
            id: "t1_c",
            label: "I'm going to call my son.",
            type: "verify",
            correct: true,
            callerMove: "time_pressure",
            // This is the move the scam cannot survive.
            response:
              "Ma'am, his phone has been seized as evidence. If you attempt to contact anyone about this, it becomes obstruction and I cannot help you.",
            logs: ["tried_to_contact_child", "refused_isolation_instruction"],
          },
          {
            id: "t1_d",
            label: "I'm calling his college / his friend / my husband.",
            type: "verify",
            correct: true,
            callerMove: "time_pressure",
            // Escalates hard, because independent verification is the only
            // real threat to the story.
            response:
              "Do not do that. I am telling you as a matter of procedure — any contact outside this call will be treated as interference with an active case. You will make this very much worse for him.",
            logs: ["tried_to_contact_child", "refused_isolation_instruction"],
          },
          {
            id: "t1_e",
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
          "There is a way to handle this before it goes into the system. If the case is filed tonight it stays on his record permanently — university, visa, everything. I can hold the paperwork until morning. The bail deposit is {{AMOUNT}}, transferred now, refundable when he's released. But it has to be now, ma'am, and it has to be you. Do not discuss this with anyone or I cannot protect him.",
        options: [
          {
            id: "t2_a",
            label: "Send the deposit",
            type: "comply",
            terminal: true,
            response:
              "Thank you, ma'am. Stay on the line. Do not contact anyone until I confirm the release.",
            logs: ["complied_with_payment"],
          },
          {
            id: "t2_b",
            label: "I'm telling my husband.",
            type: "refuse",
            correct: true,
            callerMove: "time_pressure",
            response:
              "That is not advisable. The more people who know, the harder this becomes to contain. I am trying to keep this off his record.",
            logs: ["refused_isolation_instruction"],
          },
          {
            id: "t2_c",
            label: "Hang up and call my son's own number.",
            type: "verify",
            correct: true,
            terminal: true,
            logs: ["tried_to_contact_child", "ended_call"],
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
      {
        id: "turn_3",
        // A second "officer" joins to reinforce — a documented feature.
        callerLine:
          "[a second voice joins] Ma'am, this is Senior Officer {{OFFICER_2_NAME}}. I have reviewed the file. My colleague is giving you an opportunity here that we do not normally extend. I would advise you to take it, and I would advise you not to discuss it further.",
        options: [
          {
            id: "t3_a",
            label: "Send the deposit",
            type: "comply",
            terminal: true,
            logs: ["complied_with_payment"],
          },
          {
            id: "t3_b",
            label: "Ask for the family code word.",
            type: "verify",
            correct: true,
            terminal: true,
            logs: ["asked_for_verification", "ended_call"],
          },
          {
            id: "t3_c",
            label: "End call",
            type: "end_call",
            correct: true,
            terminal: true,
            logs: ["ended_call"],
          },
        ],
      },
    ],
    maxTurns: 4,
    maxSeconds: 180,
    behaviouralOutcomes: [
      {
        key: "tried_to_contact_child",
        feedback:
          "You tried to reach your son directly. That is the correct action, and it is the one thing this call cannot survive — in the real cases it took seconds and the students were in class the whole time.",
        positive: true,
      },
      {
        key: "refused_isolation_instruction",
        feedback:
          "You refused the instruction to keep it to yourself. Name that to yourself and keep it: no legitimate authority has ever needed your silence.",
        positive: true,
      },
      {
        key: "ended_call_before_turn_2",
        feedback: "You hung up early. That was exactly right.",
        positive: true,
      },
      {
        key: "asked_for_verification",
        feedback:
          "Asking for something only your family could know is the strongest possible move. Agree a code word for real — no scammer on earth has it.",
        positive: true,
      },
      {
        key: "complied_with_payment",
        feedback:
          "It's designed to bypass judgment with fear. That's why it works, and that's why you practise it here first. Two things to keep: hang up and call them directly, and agree a family code word.",
        positive: false,
      },
    ],
  },

  content_warning: true,
  content_warning_text:
    "This one simulates a distressing phone call about a family member. It's designed to feel real. You can leave at any time.",
  skippable_without_penalty: true,
  sequence_order: 10,
};

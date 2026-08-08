// src/components/modules/InteractiveCall.tsx
//
// The shared interactive-call engine. Modules 03 and 08 are the same component
// with different `call_script` rows — build it once.
//
// Two things this engine exists to make possible, neither of which a quiz can:
//   1. The learner experiences that they cannot win the conversation. Every
//      objection is absorbed. The lesson is that you can only leave it.
//   2. It records what the learner DID, separately from what they later say.
//      The gap between "I knew it was a scam" and "I hung up" is the most
//      valuable data this app collects.
"use client";

import React from "react";
import { PhoneOff, Phone, Video, AlertTriangle } from "lucide-react";
import type { CallOption, CallScript } from "@/types/modules";

type Phase = "arming" | "ringing" | "connected" | "ended";

export interface CallOutcome {
  /** Behavioural flags, e.g. { ended_call_before_turn_2: true }. */
  log: Record<string, boolean | number | string>;
  /** Feedback lines for the outcomes that fired, in script order. */
  outcomeFeedback: Array<{ key: string; feedback: string; positive: boolean }>;
}

export function InteractiveCall({
  script,
  onComplete,
}: {
  script: CallScript;
  onComplete: (outcome: CallOutcome) => void;
}) {
  const [phase, setPhase] = React.useState<Phase>("arming");
  const [turnIndex, setTurnIndex] = React.useState(0);
  const [transcript, setTranscript] = React.useState<
    Array<{ who: "caller" | "you"; text: string }>
  >([]);
  const [seconds, setSeconds] = React.useState(0);
  const [log, setLog] = React.useState<Record<string, boolean | number | string>>({});
  const [awaitingReply, setAwaitingReply] = React.useState(false);

  const ringTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Arming -------------------------------------------------------------
  // The tap is the user gesture that unlocks the audio context. Browsers block
  // autoplay with sound; iOS Safari blocks it outright and blocks Web Audio
  // entirely when the ringer is silent. Design it into the fiction rather than
  // fighting it: "put your phone down on the table, tap when you're ready",
  // then a beat of nothing, and it rings. The pause is what makes it land.
  const arm = React.useCallback(() => {
    setPhase("ringing");
    setLog((l) => ({ ...l, armed_at: new Date().toISOString() }));

    // navigator.vibrate is Android Chrome only — feature-detect, don't assume.
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.([500, 300, 500]);
      } catch {
        /* non-fatal */
      }
    }

    // Ring for the full duration before any timeout. Discomfort is the lesson.
    ringTimer.current = setTimeout(() => {
      setPhase((p) => (p === "ringing" ? "connected" : p));
    }, (script.ring.ringSeconds ?? 12) * 1000);
  }, [script.ring.ringSeconds]);

  React.useEffect(() => {
    if (phase !== "connected") return;
    setTranscript((t) =>
      t.length ? t : [{ who: "caller", text: script.opening }]
    );
    tickTimer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (tickTimer.current) clearInterval(tickTimer.current);
    };
  }, [phase, script.opening]);

  // Each turn's caller line is delivered as soon as the turn opens, before its
  // options appear — the caller makes the ask, then you choose. Turn 1 has no
  // line of its own because the fixed opening is the ask.
  React.useEffect(() => {
    if (phase !== "connected") return;
    const line = script.turns[turnIndex]?.callerLine;
    if (!line) return;
    setTranscript((t) =>
      t.some((x) => x.text === line) ? t : [...t, { who: "caller", text: line }]
    );
  }, [phase, turnIndex, script.turns]);

  // Hard stop. Never let a learner get stuck.
  React.useEffect(() => {
    if (phase === "connected" && seconds >= script.maxSeconds) {
      finish({ hard_stop: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, phase]);

  React.useEffect(
    () => () => {
      if (ringTimer.current) clearTimeout(ringTimer.current);
      if (tickTimer.current) clearInterval(tickTimer.current);
    },
    []
  );

  function finish(extra: Record<string, boolean | number | string> = {}) {
    if (phase === "ended") return;
    if (ringTimer.current) clearTimeout(ringTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
    setPhase("ended");

    const finalLog: Record<string, boolean | number | string> = {
      ...log,
      ...extra,
      call_seconds: seconds,
    };
    const fired = script.behaviouralOutcomes.filter((o) => finalLog[o.key]);
    onComplete({ log: finalLog, outcomeFeedback: fired });
  }

  function choose(option: CallOption) {
    setTranscript((t) => [...t, { who: "you", text: option.label }]);
    const added: Record<string, boolean> = {};
    (option.logs ?? []).forEach((k) => (added[k] = true));
    if (option.type === "comply") added.complied = true;
    const nextLog = { ...log, ...added };
    setLog(nextLog);

    if (option.terminal || option.type === "end_call") {
      // A learner who hangs up in the first ten seconds did the correct thing
      // and must be told so. Never punish the safe action.
      finish(added);
      return;
    }

    if (option.response) {
      setAwaitingReply(true);
      // A slight beat before the caller replies — real calls have latency, and
      // instant replies break the illusion that there's a person there.
      setTimeout(() => {
        setTranscript((t) => [...t, { who: "caller", text: option.response! }]);
        setAwaitingReply(false);
        advanceTurn();
      }, 900);
    } else {
      advanceTurn();
    }
  }

  function advanceTurn() {
    setTurnIndex((i) => {
      const next = i + 1;
      if (next >= script.turns.length || next >= script.maxTurns) {
        setTimeout(() => finish({ reached_turn_limit: true }), 600);
        return i;
      }
      return next;
    });
  }

  const currentTurn = script.turns[turnIndex];

  // -------------------------------------------------------------------------

  if (phase === "arming") {
    return (
      <div className="bg-slate-950 text-white min-h-[460px] flex flex-col items-center justify-center gap-8 px-8 text-center">
        <p className="text-base font-medium leading-relaxed">{script.armingCopy}</p>
        <button
          onClick={arm}
          className="px-8 py-3.5 rounded-full bg-white text-slate-900 text-sm font-bold"
        >
          I'm ready
        </button>
        <p className="text-[10px] text-slate-500">
          Turn your ringer on for the full experience.
        </p>
      </div>
    );
  }

  if (phase === "ringing") {
    return (
      <div className="bg-slate-950 text-white min-h-[460px] flex flex-col items-center justify-between py-10 px-6">
        <div className="text-center space-y-2">
          {/* This label is signal S1 and must be visible. */}
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
            {script.ring.appLabel}
          </div>
          <div className="w-20 h-20 rounded-full bg-slate-800 mx-auto my-6 flex items-center justify-center">
            <Video className="w-8 h-8 text-slate-500" />
          </div>
          <div className="text-xl font-bold">{script.ring.callerName}</div>
          {/* Module 08 has no saved contact name — the number IS the caller
              name there, so don't print it twice. */}
          {script.ring.callerNumber !== script.ring.callerName && (
            <div className="text-[13px] text-slate-400">{script.ring.callerNumber}</div>
          )}
          {script.ring.callerNumber === script.ring.callerName && (
            <div className="text-[13px] text-slate-500">Not in your contacts</div>
          )}
        </div>

        <div className="flex items-center gap-16">
          <button
            onClick={() => finish({ declined_call: true, ended_call_before_turn_2: true })}
            aria-label="Decline"
            className="w-[72px] h-[72px] rounded-full bg-rose-600 flex items-center justify-center"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
          <button
            onClick={() => setPhase("connected")}
            aria-label="Accept"
            className="w-[72px] h-[72px] rounded-full bg-emerald-600 flex items-center justify-center"
          >
            <Phone className="w-7 h-7" />
          </button>
        </div>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="bg-slate-950 text-white min-h-[460px] flex flex-col items-center justify-center gap-3 px-8 text-center">
        <PhoneOff className="w-8 h-8 text-slate-500" />
        <p className="text-sm font-bold">Call ended</p>
        <p className="text-[11px] text-slate-400">
          That was a simulation. Nothing was sent, nothing was recorded off this device.
        </p>
      </div>
    );
  }

  // Connected
  return (
    <div className="bg-slate-950 text-white min-h-[460px] flex flex-col">
      {script.pressureBanner && (
        <div className="bg-rose-700 px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-wide">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {script.pressureBanner}
        </div>
      )}

      <div className="relative bg-slate-900 h-40 flex items-center justify-center shrink-0">
        <span className="text-[10px] uppercase tracking-wider text-slate-600">
          video_caller (looping)
        </span>
        <div className="absolute top-2 left-3 text-[11px] font-mono text-slate-300">
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:
          {String(seconds % 60).padStart(2, "0")}
        </div>
        {/* Always available, from second one. */}
        <button
          onClick={() => finish({ ended_call: true, ...(turnIndex === 0 ? { ended_call_before_turn_2: true } : {}) })}
          className="absolute bottom-2 right-3 px-3 py-1.5 rounded-full bg-rose-600 text-[11px] font-bold flex items-center gap-1.5"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          End call
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {transcript.map((line, i) => (
          <div
            key={i}
            className={`text-[12px] leading-relaxed rounded-xl px-3 py-2 ${
              line.who === "caller"
                ? "bg-slate-800 text-slate-100"
                : "bg-emerald-700/40 text-emerald-50 ml-8"
            }`}
          >
            {line.text}
          </div>
        ))}
        {awaitingReply && (
          <div className="text-[11px] text-slate-500 px-3">…</div>
        )}
      </div>

      {!awaitingReply && currentTurn && (
        <div className="border-t border-slate-800 p-3 space-y-2 shrink-0">
          {currentTurn.options.map((o) => (
            <button
              key={o.id}
              onClick={() => choose(o)}
              className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[12px] font-medium transition-colors"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

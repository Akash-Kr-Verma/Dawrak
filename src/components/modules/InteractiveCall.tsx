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
//
// WHAT CHANGED, AND WHY
//
// The scenario used to open by telling the learner to put their physical phone
// on the table and turn their ringer on. The browser cannot reach either of
// those. Nothing rings on the device, and on iOS the hardware ringer switch
// silences Web Audio outright — so the instruction promised something the
// experience never delivered, and the first thing the learner learned was that
// this wasn't really happening.
//
// The fix is not to promise less and show less. It is to stop claiming the
// device and make the thing on screen behave like a call: a ring screen that
// rings, with a caller you can look at; a connect delay; a running timer; the
// caller's lines arriving one at a time with a pause while he "speaks" rather
// than appearing as a wall of text; a call that can be ended from the first
// second; sound if the browser will give us sound, and no dependency on it if
// it won't.
//
// Everything about the escalation is untouched — same script, same branching,
// same three caller moves, same behavioural logging (extended, not reduced).
"use client";

import React from "react";
import { PhoneOff, Phone, AlertTriangle, Volume2, VolumeX, Mic, Video } from "lucide-react";
import type { CallOption, CallScript } from "@/types/modules";
import { CallerVideo, RingAvatar } from "./CallerVideo";

type Phase = "arming" | "ringing" | "connecting" | "connected" | "ended";

export interface CallOutcome {
  /** Behavioural flags, e.g. { ended_call_before_turn_2: true }. */
  log: Record<string, boolean | number | string>;
  /** Feedback lines for the outcomes that fired, in script order. */
  outcomeFeedback: Array<{ key: string; feedback: string; positive: boolean }>;
}

// ---------------------------------------------------------------------------
// Ringtone
//
// Synthesized rather than shipped as a file: no asset to 404, no licensing
// question, and it starts inside the learner's tap so autoplay policy is
// satisfied by construction. If Web Audio is unavailable — older browser, iOS
// with the ringer switch off, a muted tab — every call of this returns quietly
// and the simulation carries on without it. Nothing here is load-bearing.
// ---------------------------------------------------------------------------

class Ringtone {
  private ctx: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private muted = false;

  start() {
    try {
      const Ctor =
        typeof window !== "undefined"
          ? window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext
          : undefined;
      if (!Ctor) return;
      this.ctx = new Ctor();
      void this.ctx.resume();
      this.burst();
      // Two seconds of ring, four of silence — the cadence of a phone that
      // isn't being answered, which is what the pause is for.
      this.timer = setInterval(() => this.burst(), 6000);
    } catch {
      /* No audio. The call works without it. */
    }
  }

  /** A double-warble, roughly a European ring. */
  private burst() {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    [0, 0.55].forEach((offset) => {
      const t = ctx.currentTime + offset;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.09, t + 0.04);
      gain.gain.setValueAtTime(0.09, t + 0.36);
      gain.gain.linearRampToValueAtTime(0, t + 0.42);
      gain.connect(ctx.destination);

      [440, 480].forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    });
  }

  /** A short click when the call connects, so the state change is audible. */
  connectBlip() {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 620;
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  setMuted(m: boolean) {
    this.muted = m;
  }

  stopRinging() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  dispose() {
    this.stopRinging();
    try {
      void this.ctx?.close();
    } catch {
      /* already closed */
    }
    this.ctx = null;
  }
}

// ---------------------------------------------------------------------------

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
  const [muted, setMuted] = React.useState(false);
  const [frozen, setFrozen] = React.useState(false);

  const ringTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimer = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const ring = React.useRef<Ringtone | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const phaseRef = React.useRef<Phase>("arming");
  phaseRef.current = phase;

  // --- Arming -------------------------------------------------------------
  // The tap is the user gesture that unlocks the audio context — browsers block
  // autoplay with sound, so the ringtone has to start inside this handler. Then
  // a beat of nothing, and it rings. The pause is what makes it land.
  const arm = React.useCallback(() => {
    setPhase("ringing");
    setLog((l) => ({ ...l, armed_at: new Date().toISOString() }));

    ring.current = new Ringtone();
    ring.current.start();

    // navigator.vibrate is Android Chrome only — feature-detect, don't assume.
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.([500, 300, 500, 300, 500]);
      } catch {
        /* non-fatal */
      }
    }

    // Ring for the full duration before any timeout. Discomfort is the lesson.
    ringTimer.current = setTimeout(() => {
      if (phaseRef.current === "ringing") accept();
    }, (script.ring.ringSeconds ?? 12) * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script.ring.ringSeconds]);

  function accept() {
    ring.current?.stopRinging();
    ring.current?.connectBlip();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.(0);
      } catch {
        /* non-fatal */
      }
    }
    // A real call doesn't cut straight to speech. This half-second of
    // "Connecting…" is most of what makes the transition feel like a call.
    setPhase("connecting");
    setTimeout(() => setPhase((p) => (p === "connecting" ? "connected" : p)), 900);
  }

  React.useEffect(() => {
    if (phase !== "connected") return;
    setTranscript((t) => (t.length ? t : [{ who: "caller", text: script.opening }]));
    tickTimer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (tickTimer.current) clearInterval(tickTimer.current);
    };
  }, [phase, script.opening]);

  // Periodic freeze on the video. Real VoIP is imperfect, and perfection breaks
  // immersion faster than any missing detail.
  React.useEffect(() => {
    if (phase !== "connected") return;
    const id = setInterval(() => {
      setFrozen(true);
      setTimeout(() => setFrozen(false), 420);
    }, 7000);
    return () => clearInterval(id);
  }, [phase]);

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
    // Turn 2 is where the ID and the money get asked for in both scripts.
    // Reaching it is a behavioural fact worth having in the feedback: most
    // people do, and knowing that about yourself is the point of practising.
    if (turnIndex >= 1) {
      setLog((l) => ({ ...l, reached_payment_request: true }));
    }
  }, [phase, turnIndex, script.turns]);

  // Keep the newest line in view without yanking the whole page around.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript, awaitingReply]);

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
      if (endTimer.current) clearTimeout(endTimer.current);
      ring.current?.dispose();
    },
    []
  );

  function toggleMute() {
    setMuted((m) => {
      ring.current?.setMuted(!m);
      return !m;
    });
  }

  function finish(extra: Record<string, boolean | number | string> = {}) {
    if (phase === "ended") return;
    if (ringTimer.current) clearTimeout(ringTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
    ring.current?.dispose();
    setPhase("ended");

    const finalLog: Record<string, boolean | number | string> = {
      ...log,
      ...extra,
      call_seconds: seconds,
      turns_taken: turnIndex + 1,
    };
    const fired = script.behaviouralOutcomes.filter((o) => finalLog[o.key]);

    // Hold on the ended screen for a beat before handing off to the judgement.
    // Calling onComplete synchronously unmounted this component immediately, so
    // the "that was a simulation, nothing was sent" line never rendered at all
    // — and Module 08's own safety note asks for exactly that reassurance the
    // moment the call ends. It is also just how a call ends: a pause, not a
    // cut. Short enough that nobody sits in the fear.
    endTimer.current = setTimeout(
      () => onComplete({ log: finalLog, outcomeFeedback: fired }),
      1600
    );
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
      // A beat before the caller replies. Real calls have latency, and instant
      // replies break the illusion that there's a person there.
      setTimeout(() => {
        setTranscript((t) => [...t, { who: "caller", text: option.response! }]);
        setAwaitingReply(false);
        advanceTurn();
      }, 1400);
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
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60
  ).padStart(2, "0")}`;

  // -------------------------------------------------------------------------

  if (phase === "arming") {
    return (
      <div className="bg-slate-950 text-white min-h-[460px] flex flex-col items-center justify-center gap-7 px-8 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center">
          <Phone className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-[15px] font-medium leading-relaxed">{script.armingCopy}</p>
        <button
          onClick={arm}
          className="px-8 py-3.5 rounded-full bg-white text-slate-900 text-sm font-bold"
        >
          I&apos;m ready
        </button>
        {/* No instruction to change a device setting. Sound is a bonus here,
            never a requirement, and saying so is more honest than asking the
            learner to go and flip a switch that may do nothing. */}
        <p className="text-[10px] text-slate-500 leading-relaxed max-w-[240px]">
          Sound if your device allows it. Everything works without it.
        </p>
      </div>
    );
  }

  if (phase === "ringing") {
    return (
      <div className="bg-slate-950 text-white min-h-[460px] flex flex-col items-center justify-between py-9 px-6">
        <div className="text-center space-y-1.5 w-full">
          {/* This label is signal S1 and must be visible. */}
          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
            {script.ring.appLabel}
          </div>
          <div className="text-[11px] text-slate-500">Incoming call…</div>

          <div className="relative w-24 h-24 mx-auto my-6">
            {/* Two offset pulses — a phone ringing at you, not a static avatar. */}
            <span className="absolute inset-0 rounded-full bg-white/10 animate-ping" />
            <span
              className="absolute -inset-3 rounded-full bg-white/5 animate-ping"
              style={{ animationDelay: "600ms" }}
            />
            <div className="relative w-24 h-24 rounded-full overflow-hidden ring-2 ring-white/15">
              <RingAvatar avatar={script.ring.avatar} />
            </div>
          </div>

          <div className="text-[22px] font-bold leading-tight px-4">
            {script.ring.callerName}
          </div>
          {/* Module 08 has no saved contact name — the number IS the caller
              name there, so don't print it twice. */}
          {script.ring.callerNumber !== script.ring.callerName ? (
            <div className="text-[13px] text-slate-400">{script.ring.callerNumber}</div>
          ) : (
            <div className="text-[13px] text-slate-500">Not in your contacts</div>
          )}
        </div>

        <div className="w-full">
          <div className="flex items-center justify-center gap-16">
            <div className="flex flex-col items-center gap-2">
              {/* Declining sets `declined_call` and NOT
                  `ended_call_before_turn_2`: not answering at all and hanging
                  up ten seconds in are different things a learner did, and
                  collapsing them meant two different branches produced word
                  for word the same feedback. "Before turn 2" is still
                  recoverable from `turns_taken` in the log. */}
              <button
                onClick={() => finish({ declined_call: true })}
                aria-label="Decline"
                className="w-[68px] h-[68px] rounded-full bg-rose-600 flex items-center justify-center active:scale-95 transition-transform"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <span className="text-[10px] text-slate-500">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={accept}
                aria-label="Accept"
                className="w-[68px] h-[68px] rounded-full bg-emerald-600 flex items-center justify-center active:scale-95 transition-transform animate-pulse"
              >
                <Phone className="w-6 h-6" />
              </button>
              <span className="text-[10px] text-slate-500">Accept</span>
            </div>
          </div>
          <button
            onClick={toggleMute}
            className="mx-auto mt-5 flex items-center gap-1.5 text-[10px] text-slate-500"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            {muted ? "Sound off" : "Sound on"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "connecting") {
    return (
      <div className="bg-slate-950 text-white min-h-[460px] flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-white/10">
          <RingAvatar avatar={script.ring.avatar} />
        </div>
        <div className="text-base font-bold">{script.ring.callerName}</div>
        <div className="text-[12px] text-slate-400 animate-pulse">Connecting…</div>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="bg-slate-950 text-white min-h-[460px] flex flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center">
          <PhoneOff className="w-6 h-6 text-slate-500" />
        </div>
        <p className="text-sm font-bold">Call ended</p>
        <p className="text-[12px] text-slate-400 tabular-nums">{clock}</p>
        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
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

      <div className="relative bg-slate-900 h-44 shrink-0 overflow-hidden">
        <CallerVideo
          speaking={awaitingReply || transcript[transcript.length - 1]?.who === "caller"}
          frozen={frozen}
          variant={script.pressureBanner ? "police" : "customs"}
        />

        {/* Call chrome over the feed. */}
        <div className="absolute top-2 left-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-[11px] font-mono text-white/90 tabular-nums drop-shadow">
            {clock}
          </span>
        </div>
        <div className="absolute top-2 right-3 flex items-center gap-2 text-white/70">
          <Mic className="w-3.5 h-3.5" />
          <Video className="w-3.5 h-3.5" />
          <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
        {/* Your own camera, picture-in-picture, as every video app does. */}
        <div className="absolute bottom-2 left-3 w-12 h-16 rounded-md bg-slate-800 border border-white/10 flex items-center justify-center">
          <span className="text-[8px] text-slate-500 text-center leading-tight px-1">You</span>
        </div>
        {/* Always available, from second one. */}
        <button
          onClick={() =>
            finish({
              ended_call: true,
              ...(turnIndex === 0 ? { ended_call_before_turn_2: true } : {}),
            })
          }
          className="absolute bottom-2 right-3 px-3 py-1.5 rounded-full bg-rose-600 text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          End call
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scroll-smooth">
        {transcript.map((line, i) => (
          <div
            key={i}
            className={`text-[12px] leading-relaxed rounded-xl px-3 py-2 animate-call-line-in motion-reduce:animate-none ${
              line.who === "caller"
                ? "bg-slate-800 text-slate-100"
                : "bg-emerald-700/40 text-emerald-50 ml-8"
            }`}
          >
            {line.text}
          </div>
        ))}
        {awaitingReply && (
          <div className="flex items-center gap-1 px-3 py-2" aria-label="Caller is speaking">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {!awaitingReply && currentTurn && (
        <div className="border-t border-slate-800 p-3 space-y-2 shrink-0">
          {currentTurn.options.map((o) => (
            <button
              key={o.id}
              onClick={() => choose(o)}
              className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-[12px] font-medium transition-colors"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

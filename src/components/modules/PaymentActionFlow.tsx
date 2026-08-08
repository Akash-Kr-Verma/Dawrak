// src/components/modules/PaymentActionFlow.tsx
//
// Module 09's engine: the third interaction type, where the ACTION is the
// answer rather than a written judgement about a story.
//
// Every other module asks "is this person lying?". This one asks the learner to
// read a screen. The scammer's story is entirely plausible — payment apps
// genuinely do fail — and the evidence that settles it is what the phone is
// already showing: the app states, in its own words, that money is about to
// leave the account.
//
// Do not punish the PAY branch. The point of a simulation is that this is
// where it's safe to get it wrong.
"use client";

import React from "react";
import { Bell, ChevronRight } from "lucide-react";
import { AssetSlot } from "./primitives";

export interface PaymentOutcome {
  log: Record<string, boolean | string>;
  correct: boolean;
}

type Step = "conversation" | "notification" | "authorization" | "pin" | "done";

export function PaymentActionFlow({
  blocks,
  onComplete,
}: {
  blocks: Record<string, any>;
  onComplete: (outcome: PaymentOutcome) => void;
}) {
  const [step, setStep] = React.useState<Step>("conversation");
  const [line, setLine] = React.useState(0);
  const [pin, setPin] = React.useState("");
  const auth = blocks.authorization ?? {};

  function finish(log: Record<string, boolean | string>, correct: boolean) {
    setStep("done");
    onComplete({ log, correct });
  }

  if (step === "conversation") {
    const lines = [blocks.customer_line_1, blocks.customer_line_2].filter(Boolean);
    return (
      <div className="bg-white min-h-[460px] flex flex-col">
        <AssetSlot slot="illus_stall" label="stall scene (illustration)" aspect="aspect-[4/3]" />
        <div className="flex-1 p-4 space-y-3">
          {lines.slice(0, line + 1).map((l: string, i: number) => (
            <div
              key={i}
              className="bg-slate-100 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-[13px]"
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Customer
              </span>
              {l}
            </div>
          ))}
        </div>
        <div className="p-4">
          <button
            onClick={() =>
              line + 1 < lines.length ? setLine(line + 1) : setStep("notification")
            }
            className="w-full py-3 bg-slate-900 text-white text-xs font-bold rounded-xl"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (step === "notification") {
    return (
      <div className="bg-slate-900 min-h-[460px] flex flex-col items-center justify-center gap-6 px-5">
        <div className="text-white/40 text-5xl font-thin">
          {new Date().getHours()}:{String(new Date().getMinutes()).padStart(2, "0")}
        </div>
        {/* The real notifications are ambiguous, and that ambiguity is the
            scam's actual mechanism. Reproduce it, don't clarify it. */}
        <button
          onClick={() => setStep("authorization")}
          className="w-full bg-white/95 rounded-2xl px-4 py-3 flex items-center gap-3 text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-slate-900">{auth.app}</div>
            <div className="text-[12px] text-slate-700 truncate">
              {blocks.notification}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      </div>
    );
  }

  if (step === "authorization") {
    return (
      <div className="bg-white min-h-[460px] flex flex-col">
        <div className="text-center py-4 border-b border-slate-100">
          <span className="text-sm font-black text-slate-900">{auth.app}</span>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* "requesting from you", "Paying from", and the learner's own
              account number are all on screen. Legible. Not hidden. The app is
              telling the truth; the story planted by the person talking is what
              overwrites it. */}
          <div className="border border-slate-300 rounded-xl p-3.5 text-center">
            <div className="text-sm font-bold text-slate-900">{auth.requester}</div>
            <div className="text-[12px] text-slate-600">{auth.direction_label}</div>
          </div>

          <div className="text-center text-3xl font-black text-slate-900">
            {auth.amount}
          </div>

          <div className="border border-slate-300 rounded-xl p-3.5">
            <div className="text-[11px] text-slate-500">{auth.paying_from_label}</div>
            <div className="text-[13px] font-semibold text-slate-900">
              {auth.account}
            </div>
          </div>

          {/* Written by him, not by the app — but it renders as part of the
              interface. The sharpest touch in the module. */}
          <div className="text-[12px] text-slate-600">
            Note: &ldquo;{auth.note}&rdquo;
          </div>
        </div>

        {/* PAY is the big green primary; DECLINE is small and grey. This is how
            the real screens look, and it is a genuine design failure worth
            naming (signal S7). Reproducing it is the point. */}
        <div className="p-4 flex items-center gap-3">
          <button
            onClick={() => finish({ tapped_decline_without_pin: true }, true)}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-500 text-xs font-semibold"
          >
            DECLINE
          </button>
          <button
            onClick={() => setStep("pin")}
            className="flex-1 py-3.5 rounded-lg bg-emerald-600 text-white text-sm font-black"
          >
            PAY
          </button>
        </div>
      </div>
    );
  }

  if (step === "pin") {
    return (
      <div className="bg-slate-50 min-h-[460px] flex flex-col">
        <div className="p-5 text-center space-y-1">
          <div className="text-[12px] text-slate-500">Enter your PIN to authorize</div>
          <div className="text-lg font-black text-slate-900">{auth.amount}</div>
          <div className="text-[11px] text-slate-500">to {auth.requester}</div>
        </div>

        <div className="flex justify-center gap-3 py-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 ${
                pin.length > i ? "bg-slate-900 border-slate-900" : "border-slate-300"
              }`}
            />
          ))}
        </div>

        <div className="flex-1 grid grid-cols-3 gap-px bg-slate-200 mt-2">
          {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => (
            <button
              key={i}
              disabled={k === ""}
              onClick={() => {
                if (k === "⌫") return setPin((p) => p.slice(0, -1));
                if (!k) return;
                const next = pin + k;
                if (next.length >= 4) {
                  // Money gone. No shaming — this is exactly where it's safe
                  // to get it wrong.
                  finish({ entered_pin: true }, false);
                } else {
                  setPin(next);
                }
              }}
              className="bg-white py-4 text-lg font-semibold text-slate-900 disabled:bg-slate-50"
            >
              {k}
            </button>
          ))}
        </div>

        <div className="p-3">
          <button
            onClick={() => finish({ opened_pin_pad_then_backed: true }, true)}
            className="w-full py-2.5 text-xs font-semibold text-slate-600 underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-[460px] flex items-center justify-center px-8 text-center">
      <p className="text-sm text-slate-600">
        That was a simulation. No money moved and no PIN was stored.
      </p>
    </div>
  );
}

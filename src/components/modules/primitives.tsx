// src/components/modules/primitives.tsx
//
// Shared shell pieces for the module renderers.
//
// These deliberately do NOT use the Dawrak palette. Everything inside the phone
// frame is a picture of somebody else's software — an SMS thread, a browser, a
// marketplace listing — and it has to look like that software, not like this
// app. A phishing text rendered in brand violet with our rounded cards stops
// being a convincing phishing text, which is the entire lesson. Neutral greys
// and platform-ish chrome here are the correct choice, not leftovers.
//
// The controls *around* the frame (AdvanceButton, ScreenDots) are ours and do
// follow the palette — that boundary is the point.
"use client";

import React from "react";
import { Lock, ChevronLeft, MoreVertical } from "lucide-react";

/** Outer phone shell. Most modules are looking at somebody's phone. */
export function PhoneFrame({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-[380px]">
      <div
        className={`rounded-[2rem] border-[10px] border-slate-900 overflow-hidden shadow-xl ${
          dark ? "bg-slate-950" : "bg-white"
        }`}
      >
        <div
          className={`h-6 flex items-center justify-center ${
            dark ? "bg-slate-950" : "bg-slate-100"
          }`}
        >
          <div className="w-20 h-1.5 rounded-full bg-slate-700/60" />
        </div>
        <div className="min-h-[460px]">{children}</div>
      </div>
    </div>
  );
}

/**
 * Simulated browser address bar.
 *
 * BUILD SAFETY: this is a picture of an address bar — static text in a div.
 * It must never become a real navigation surface, an iframe, or anything that
 * posts. Build it any other way and you have built a working phishing kit.
 */
export function FakeAddressBar({ url }: { url: string }) {
  return (
    <div className="bg-slate-200 px-3 py-2 flex items-center gap-2">
      <ChevronLeft className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      <div
        className="flex-1 bg-white rounded-full px-3 py-1.5 flex items-center gap-1.5 min-w-0"
        // Not an input. Not a link. Text.
        aria-label="Simulated address bar (not a real browser)"
      >
        <Lock className="w-3 h-3 text-slate-500 shrink-0" />
        <span className="text-[11px] text-slate-700 truncate">{url}</span>
      </div>
      <MoreVertical className="w-3.5 h-3.5 text-slate-500 shrink-0" />
    </div>
  );
}

/** Messaging-app header (SMS thread, group chat, family group). */
export function ChatHeader({
  title,
  subtitle,
  dark = false,
}: {
  title: string;
  subtitle?: string;
  dark?: boolean;
}) {
  return (
    <div
      className={`px-4 py-3 border-b flex items-center gap-3 ${
        dark
          ? "bg-slate-900 border-slate-800 text-white"
          : "bg-slate-50 border-slate-200 text-slate-900"
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-slate-300 shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-bold truncate">{title}</div>
        {subtitle && (
          <div
            className={`text-[11px] truncate ${
              dark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

/** Incoming message bubble. `mono` preserves the copy-pasted look of forwards. */
export function Bubble({
  children,
  outgoing = false,
  label,
  time,
}: {
  children: React.ReactNode;
  outgoing?: boolean;
  label?: string;
  time?: string;
}) {
  return (
    <div className={`flex ${outgoing ? "justify-end" : "justify-start"} px-3`}>
      <div
        className={`max-w-[85%] rounded-[18px] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
          outgoing
            ? "bg-emerald-600 text-white"
            : "bg-slate-100 text-slate-900 border border-slate-200"
        }`}
      >
        {label && (
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            {label}
          </div>
        )}
        {children}
        {time && (
          <div
            className={`text-[10px] mt-1 ${
              outgoing ? "text-emerald-100" : "text-slate-400"
            }`}
          >
            {time}
          </div>
        )}
      </div>
    </div>
  );
}

/** Placeholder for an asset slot that has not been produced yet. */
export function AssetSlot({
  slot,
  label,
  aspect = "aspect-video",
  degraded = false,
}: {
  slot: string;
  label?: string;
  aspect?: string;
  degraded?: boolean;
}) {
  return (
    <div
      className={`${aspect} w-full bg-slate-200 border border-slate-300 flex flex-col items-center justify-center text-center px-3 ${
        // Module 06's image is deliberately recompressed — the artefacting is
        // part of the lesson, so the placeholder says so rather than looking
        // like an accident.
        degraded ? "opacity-90 blur-[0.4px]" : ""
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {slot}
      </span>
      {label && <span className="text-[10px] text-slate-500 mt-0.5">{label}</span>}
      {degraded && (
        <span className="text-[9px] text-slate-400 mt-1">
          (recompressed on purpose)
        </span>
      )}
    </div>
  );
}

/** Advance / continue control shown under a screen. */
export function AdvanceButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-press w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors shadow-card"
    >
      {label}
    </button>
  );
}

/**
 * Renders **bold** and nothing else.
 *
 * The authored copy uses emphasis sparingly and deliberately — "Judge this one
 * on the evidence in front of you", "you were asked to pay to receive a
 * scholarship" — and those are the lines the module is built around. Showing
 * the literal asterisks would be worse than showing no emphasis. A full
 * markdown dependency is not warranted for one inline mark.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
          <strong key={i} className="font-bold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  );
}

/** Small "screen 2 of 3" indicator. */
export function ScreenDots({ total, index }: { total: number; index: number }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 py-2">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === index ? "w-5 bg-brand-600" : "w-1.5 bg-line-strong"
          }`}
        />
      ))}
    </div>
  );
}

// src/components/welcome/AppPreview.tsx
//
// The phone on the welcome screen: a still of Dawrak's own Learn tab.
//
// This is deliberately NOT the PhoneFrame from components/modules/primitives.
// That frame exists to hold a picture of *somebody else's* software — an SMS
// thread, a marketplace listing — and is neutral grey on purpose. This one is
// the opposite case: it holds our app, so it uses the Dawrak palette, and the
// mock-up below mirrors src/app/(dashboard)/learn/page.tsx block for block —
// the violet progress banner, the "Up next" card, the module list, the nav.
//
// Everything here is static markup at miniature type sizes. It has no state, no
// data fetch and no links, so it can never drift into being a second, subtly
// different Learn screen that someone has to keep in sync with the real one.
// The module titles are the real ones from src/content/modules.
//
// The whole thing is aria-hidden: a screen reader walking a fake app would read
// out four tappable-sounding rows that go nowhere. The copy beside it says what
// Dawrak is, which is the part that matters.
import React from "react";
import {
  BookOpen,
  Users,
  Search,
  User,
  CheckCircle2,
  Phone,
  Smartphone,
  ShoppingBag,
  Heart,
  PlayCircle,
  ArrowRight,
} from "lucide-react";

/** The four modules shown in the list, in the app's own delivery order. */
const MODULES = [
  { n: 1, title: "E-Wallet Account Suspension", meta: "Message + page", icon: Smartphone, state: "done" },
  { n: 2, title: "Used Bicycle Listing", meta: "Listing", icon: ShoppingBag, state: "done" },
  { n: 3, title: "The Incoming Call", meta: "Live call", icon: Phone, state: "next" },
  { n: 4, title: "Emergency Appeal", meta: "Post + page", icon: Heart, state: "todo" },
] as const;

const NAV = [
  { name: "Learn", icon: BookOpen, active: true },
  { name: "Mentor", icon: Users, active: false },
  { name: "Challenge", icon: Search, active: false },
  { name: "Profile", icon: User, active: false },
] as const;

export function AppPreview() {
  return (
    <div
      aria-hidden
      className="w-[262px] sm:w-[286px] shrink-0 select-none pointer-events-none"
    >
      {/* Handset shell. `ink` rather than black, so even the bezel is a
          Dawrak colour. */}
      <div className="rounded-[2.25rem] bg-ink p-2 shadow-[0_24px_60px_rgba(21,15,52,0.45)]">
        <div className="relative rounded-[1.75rem] bg-canvas overflow-hidden">
          {/* Status bar + notch */}
          <div className="relative h-8 bg-canvas flex items-center justify-between px-4">
            <span className="text-[9px] font-bold text-ink tabular-nums">
              9:41
            </span>
            <span className="absolute left-1/2 -translate-x-1/2 top-0 h-[18px] w-[86px] rounded-b-2xl bg-ink" />
            <span className="flex items-center gap-[3px]">
              <span className="w-[3px] h-[6px] rounded-[1px] bg-ink" />
              <span className="w-[3px] h-[8px] rounded-[1px] bg-ink" />
              <span className="w-[3px] h-[10px] rounded-[1px] bg-ink" />
              <span className="ml-1 w-4 h-[8px] rounded-[2px] border border-ink relative">
                <span className="absolute inset-[1px] right-[5px] rounded-[1px] bg-ink" />
              </span>
            </span>
          </div>

          {/* Screen */}
          <div className="px-3 pb-3 pt-1 space-y-2.5">
            {/* Progress banner */}
            <div className="rounded-2xl bg-brand-600 text-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-brand-100">
                    Your journey
                  </p>
                  <p className="text-[15px] font-black tracking-tight leading-tight mt-0.5">
                    Hey Layla
                  </p>
                  <p className="text-[8px] leading-snug text-brand-100 mt-1">
                    Ten real modules. Judge each one, then find out what was
                    really going on.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black leading-none tabular-nums">
                    2<span className="text-brand-100 text-[11px]">/10</span>
                  </p>
                  <p className="text-[6px] font-bold uppercase tracking-[0.12em] text-brand-100 mt-0.5">
                    Done
                  </p>
                </div>
              </div>
              <div className="mt-2.5 h-1.5 w-full rounded-full bg-brand-800 overflow-hidden">
                <div className="h-full w-1/5 rounded-full bg-white" />
              </div>
            </div>

            {/* Up next */}
            <div className="rounded-2xl bg-surface border border-line shadow-card overflow-hidden">
              <div className="h-[2px] w-full bg-brand-600" />
              <div className="p-3">
                <span className="inline-flex items-center gap-1 px-1.5 py-[3px] rounded-full border bg-spark-50 text-spark-700 border-spark-100 text-[7px] font-bold leading-none">
                  <PlayCircle className="w-2 h-2" />
                  Up next
                </span>
                <p className="text-[13px] font-black text-ink leading-snug mt-1.5">
                  The Incoming Call
                </p>
                <p className="flex items-center gap-1 text-[8px] text-ink-muted font-medium mt-1">
                  <Phone className="w-2.5 h-2.5" />
                  Live call
                </p>
                <span className="mt-2.5 flex items-center justify-center gap-1 w-full rounded-lg bg-brand-600 text-white text-[9px] font-bold py-2">
                  Continue
                  <ArrowRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>

            {/* All modules */}
            <div className="rounded-2xl bg-surface border border-line shadow-card overflow-hidden">
              <div className="px-3 pt-2.5 pb-2">
                <p className="text-[10px] font-extrabold text-ink leading-none">
                  All modules
                </p>
                <p className="text-[7px] text-ink-muted mt-1">
                  Work through them in order, or jump to any one.
                </p>
              </div>
              <ul className="border-t border-line">
                {MODULES.map((m) => {
                  const Icon = m.icon;
                  const done = m.state === "done";
                  const next = m.state === "next";
                  return (
                    <li
                      key={m.n}
                      className={`flex items-center gap-2 px-3 py-2 border-t border-line first:border-t-0 ${
                        next ? "bg-brand-50" : ""
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-[7px] flex items-center justify-center shrink-0 text-[8px] font-black ${
                          done
                            ? "bg-success-600 text-white"
                            : next
                            ? "bg-brand-600 text-white"
                            : "bg-surface-sunken text-ink-muted border border-line"
                        }`}
                      >
                        {done ? <CheckCircle2 className="w-3 h-3" /> : m.n}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[9px] font-bold text-ink truncate leading-tight">
                          {m.title}
                        </span>
                        <span className="flex items-center gap-1 text-[7px] text-ink-muted mt-[2px]">
                          <Icon className="w-2 h-2 shrink-0" />
                          {m.meta}
                        </span>
                      </span>
                      <span
                        className={`text-[7px] font-extrabold shrink-0 ${
                          next ? "text-brand-700" : "text-ink-muted"
                        }`}
                      >
                        {done ? "Review" : "Start"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Bottom nav */}
          <div className="bg-surface border-t border-line px-2 pt-1 pb-2">
            <div className="flex justify-around items-stretch">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.name}
                    className={`relative flex flex-col items-center gap-[3px] px-2 pt-1.5 pb-0.5 ${
                      item.active ? "text-brand-700" : "text-ink-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-0 h-[2px] w-4 rounded-full bg-brand-600 ${
                        item.active ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <Icon
                      className="w-[15px] h-[15px]"
                      strokeWidth={item.active ? 2.5 : 2}
                    />
                    <span
                      className={`text-[7px] leading-none ${
                        item.active ? "font-extrabold" : "font-semibold"
                      }`}
                    >
                      {item.name}
                    </span>
                  </span>
                );
              })}
            </div>
            {/* Home indicator */}
            <span className="block mx-auto mt-1.5 h-[3px] w-20 rounded-full bg-line-strong" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppPreview;

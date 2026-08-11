// src/components/layout/BottomNav.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Users, Search, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui";

const NAV = [
  { name: "Learn", href: "/learn", icon: BookOpen },
  { name: "Mentor", href: "/mentor", icon: Users },
  { name: "Challenge", href: "/challenge", icon: Search },
  { name: "Profile", href: "/profile", icon: User },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const { profile, user } = useAuth();

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-line pb-safe"
    >
      <div className="max-w-md mx-auto flex justify-around items-stretch px-2 py-1.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const isProfile = item.href === "/profile";

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex flex-col items-center justify-center gap-1 min-w-[68px] min-h-[52px] px-2 py-1.5 rounded-xl transition-colors ${
                isActive ? "text-brand-700" : "text-ink-muted hover:text-ink"
              }`}
            >
              {/* Active marker: a short bar rather than a filled pill, so the
                  icon row stays calm with four items on a 375px screen. */}
              <span
                className={`absolute top-0 h-[3px] w-7 rounded-full transition-opacity ${
                  isActive ? "bg-brand-600 opacity-100" : "opacity-0"
                }`}
              />
              {isProfile && profile?.avatar_url ? (
                <span
                  className={`rounded-full transition-all ${
                    isActive ? "ring-2 ring-brand-600" : "ring-2 ring-transparent"
                  }`}
                >
                  <Avatar
                    url={profile.avatar_url}
                    name={profile?.username ?? user?.email}
                    size={22}
                  />
                </span>
              ) : (
                <Icon
                  className="w-[22px] h-[22px]"
                  strokeWidth={isActive ? 2.5 : 2}
                />
              )}
              <span
                className={`text-[11px] leading-none ${
                  isActive ? "font-extrabold" : "font-semibold"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

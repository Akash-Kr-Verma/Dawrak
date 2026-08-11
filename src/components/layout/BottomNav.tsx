// src/components/layout/BottomNav.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Users, Award, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Learn', href: '/learn', icon: BookOpen },
    { name: 'Mentor Hub', href: '/mentor', icon: Users },
    { name: 'Challenge', href: '/challenge', icon: Award },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50 bg-white/80 backdrop-blur-md border border-white rounded-3xl shadow-xl shadow-indigo-500/10 py-2 px-4 md:top-0 md:bottom-auto md:left-0 md:right-0 md:rounded-none md:border-x-0 md:border-t-0 md:py-3 md:px-8 transition-all">
      <div className="max-w-5xl mx-auto flex justify-around md:justify-center md:gap-8 items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col md:flex-row md:gap-2 items-center justify-center min-w-[64px] min-h-[44px] px-3 py-1.5 rounded-2xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'bg-primary-soft text-primary font-bold shadow-sm'
                  : 'text-slate-400 hover:text-primary hover:bg-primary-soft md:hover:shadow-sm'
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 md:mb-0 ${
                  isActive ? 'text-primary stroke-[2.5]' : 'stroke-2'
                }`}
              />
              <span className="text-[10px] md:text-sm leading-none font-semibold">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

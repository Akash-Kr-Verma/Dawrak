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
    <nav className="fixed bottom-4 left-4 right-4 z-50 bg-white/80 backdrop-blur-md border border-white rounded-3xl shadow-xl shadow-indigo-500/10 py-2 px-4">
      <div className="max-w-md mx-auto flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] px-3 py-1.5 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'bg-[#7C3AED]/10 text-[#7C3AED] font-bold'
                  : 'text-slate-400 hover:text-[#7C3AED] hover:bg-[#7C3AED]/5'
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 ${
                  isActive ? 'text-[#7C3AED] stroke-[2.5]' : 'stroke-2'
                }`}
              />
              <span className="text-[10px] leading-none font-semibold">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

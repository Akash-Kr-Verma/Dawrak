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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg py-2 px-4">
      <div className="max-w-md mx-auto flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[48px] px-2 py-1 rounded-xl transition-colors ${
                isActive
                  ? 'text-[#0F172A] font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon
                className={`w-6 h-6 mb-1 ${
                  isActive ? 'text-[#0F172A] stroke-[2.5]' : 'stroke-2'
                }`}
              />
              <span className="text-xs leading-none">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

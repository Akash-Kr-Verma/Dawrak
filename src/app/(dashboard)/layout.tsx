// src/app/(dashboard)/layout.tsx
import React from 'react';
import BottomNav from '@/components/layout/BottomNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink-soft">
      {/* pb clears the fixed nav plus the iOS home indicator. */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}

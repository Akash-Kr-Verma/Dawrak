// src/app/(dashboard)/layout.tsx
import React from 'react';
import BottomNav from '@/components/layout/BottomNav';
import GuidedTour from '@/components/tour/GuidedTour';

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

      {/* First-run walkthrough. Renders nothing at all unless it is running,
          and reads the screens through data-tour attributes — it owns no app
          state. Deleting this line removes the tour. */}
      <GuidedTour />
    </div>
  );
}

// src/app/(dashboard)/layout.tsx
import React from 'react';
import BottomNav from '@/components/layout/BottomNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] pb-24">
      {/* Main Page Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {children}
      </main>

      {/* Persistent Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}

// src/app/(dashboard)/learn/[slug]/page.tsx
//
// Runs one module. All three interaction engines land here; which one is used
// is decided by the module's render_spec, not by this route.
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useModule } from "@/hooks/useModules";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ModuleRunner } from "@/components/modules/ModuleRunner";

export default function ModulePage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { module: mod, loading, error } = useModule(params.slug);

  const firstName =
    profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || undefined;

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto pb-20 space-y-5">
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All modules
        </Link>

        {loading && (
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-800">
            Couldn&apos;t load this module: {error}
          </div>
        )}

        {mod && (
          <ModuleRunner
            module={mod}
            learnerFirstName={firstName}
            onFinished={() => router.push("/learn")}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

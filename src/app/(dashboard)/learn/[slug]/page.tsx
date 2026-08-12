// src/app/(dashboard)/learn/[slug]/page.tsx
//
// Runs one module. All three interaction engines land here; which one is used
// is decided by the module's render_spec, not by this route.
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { useAuth, displayName } from "@/hooks/useAuth";
import { useModule } from "@/hooks/useModules";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ModuleRunner } from "@/components/modules/ModuleRunner";

export default function ModulePage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { module: mod, loading, error } = useModule(params.slug);

  // Modules address the learner by name inside the scenario copy.
  const firstName = displayName(profile, user?.email).split(" ")[0];

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto space-y-5">
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-ink-muted hover:text-brand-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All modules
        </Link>

        {loading && (
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-danger-50 border border-danger-100 rounded-2xl p-4 text-sm text-danger-700 font-medium">
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

// src/app/login/page.tsx
"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Shield, Mail, Lock, LogIn, UserPlus, Loader2, Award } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email / Password Login or Signup
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        alert("Account created! You are now logged in.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
      router.push("/profile");
    } catch (err: any) {
      setError(err.message || "Authentication failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Demo Login (Hackathon UX Feature)
  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // Signs in with pre-seeded demo user (or anonymous fallback)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: "demo@playyourpart.org",
        password: "HackathonDemoPassword2026!",
      });

      if (signInError) {
        // If demo account doesn't exist yet, create it instantly
        await supabase.auth.signUp({
          email: "demo@playyourpart.org",
          password: "HackathonDemoPassword2026!",
        });
      }
      router.push("/profile");
    } catch (err: any) {
      setError("Demo login unavailable. Please create a test account above.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-slate-900 text-emerald-400 rounded-xl flex items-center justify-center mx-auto shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            {isSignUp ? "Create Changemaker Account" : "Welcome Back"}
          </h1>
          <p className="text-xs text-slate-500">
            {isSignUp
              ? "Join the media literacy defense network."
              : "Log in to track your critical reasoning analytics."}
          </p>
        </div>

        {/* 1-Click Demo Login Banner (For Judges) */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>Hackathon Judge Demo Access</span>
          </div>
          <p className="text-xs text-emerald-800">
            Skip registration and test immediately as a pre-loaded user.
          </p>
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm"
          >
            1-Click Demo Sign-In
          </button>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-slate-400 text-xs font-semibold">
            OR USE EMAIL
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors shadow-md flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Sign Up & Get Started</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-emerald-400" />
                <span>Log In to Account</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Login/Signup */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium underline"
          >
            {isSignUp
              ? "Already have an account? Log In"
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}

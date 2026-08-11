// src/app/login/page.tsx
"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Shield, Mail, Lock, LogIn, UserPlus, Loader2, Award, Sparkles } from "lucide-react";
import { FloatingBackgroundDoodles } from "@/components/FloatingBackgroundDoodles";

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
        router.push("/onboarding");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push("/profile");
      }
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
    
    // Generate a unique demo email per device so progress isn't shared/lost,
    // and new judges get to experience the onboarding flow.
    let demoEmail = localStorage.getItem('demo_email');
    if (!demoEmail) {
      demoEmail = `demo+${Date.now()}@milpill.org`;
      localStorage.setItem('demo_email', demoEmail);
    }
    const demoPassword = "HackathonDemoPassword2026!";

    try {
      // 1. Attempt to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });

      // 2. If login fails because user doesn't exist, create the demo account instantly
      if (signInError && signInError.message.toLowerCase().includes("invalid login")) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPassword,
        });

        if (signUpError) throw signUpError;

        // Ensure we are signed in after signup
        if (signUpData.session) {
          router.push("/onboarding");
          return;
        }
      } else if (signInError) {
        throw signInError;
      }

      // Successful Sign-In
      router.push("/profile");
    } catch (err: any) {
      console.error("Demo Login Error:", err);
      // Helpful error message if Email Confirmation is still turned ON in Supabase
      if (err.message?.toLowerCase().includes("email not confirmed")) {
        setError("Supabase Error: Please turn OFF 'Confirm email' in Supabase Auth -> Providers -> Email.");
      } else if (err.message?.toLowerCase().includes("failed to fetch")) {
        setError("Network Error: Check your .env.local keys and restart npm run dev.");
      } else {
        setError(err.message || "Demo login failed. Try creating a manual account above.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden min-h-screen bg-gradient-to-b from-[#EEF2FF] via-[#E0E7FF] to-[#C7D2FE] flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4">
      <FloatingBackgroundDoodles />
      {/* Floating illustration area (top half on mobile) */}
      <div className="flex-1 sm:flex-none flex flex-col items-center justify-center py-10 sm:py-0 sm:mb-8 animate-fade-up">
        <div className="relative w-32 h-32 mb-4 animate-float bg-white rounded-3xl rounded-br-none shadow-xl shadow-indigo-500/20 p-2 flex items-center justify-center">
          <Image
            src="/asset/mascot-wave.png"
            alt="Mascot Waving"
            fill
            className="object-contain p-2"
          />
        </div>
        <div className="flex items-center gap-1.5 text-[#7C3AED]">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-bold tracking-widest uppercase">MILPill</span>
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      {/* Bottom-sheet style card */}
      <div className="w-full max-w-md bg-white rounded-t-[3rem] sm:rounded-3xl shadow-2xl shadow-indigo-500/10 p-8 space-y-6 animate-fade-up">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-[#1E1B4B] tracking-tight">
            {isSignUp ? "Create Changemaker Account" : "Welcome Back"}
          </h1>
          <p className="text-xs text-slate-500">
            {isSignUp
              ? "Join the media literacy defense network."
              : "Log in to track your critical reasoning analytics."}
          </p>
        </div>

        {/* 1-Click Demo Login Banner (For Judges) */}
        <div className="bg-[#ECFCCB] border border-[#BEF264] rounded-2xl p-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-xs font-black text-[#365314] uppercase tracking-wider">
            <Award className="w-4 h-4 text-[#65A30D]" />
            <span>Hackathon Judge Demo Access</span>
          </div>
          <p className="text-xs text-[#4D7C0F]">
            Skip registration and test immediately as a pre-loaded user.
          </p>
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-3 px-4 bg-[#A3E635] hover:bg-[#84CC16] text-slate-900 font-black rounded-full text-sm transition-all shadow-md shadow-lime-500/20 btn-bouncy"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              "⚡ 1-Click Demo Sign-In"
            )}
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
            <label className="text-xs font-bold text-[#1E1B4B]">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#7C3AED]/50 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 border border-indigo-100 bg-indigo-50/30 rounded-2xl text-sm focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]/30 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#1E1B4B]">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#7C3AED]/50 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border border-indigo-100 bg-indigo-50/30 rounded-2xl text-sm focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]/30 focus:outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold rounded-full text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 btn-bouncy"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4 text-[#A3E635]" />
                <span>Sign Up & Get Started</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-[#A3E635]" />
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
            className="text-xs text-[#7C3AED] hover:text-[#6D28D9] font-semibold underline underline-offset-2"
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

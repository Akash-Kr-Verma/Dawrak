"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  Send,
  RefreshCcw,
  Flag,
  Info,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";
import { Scenario } from "@/types/database";

type VerdictType = "fake" | "real" | "more_evidence" | null;

export default function ChallengePage() {
  const { profile, refreshProfile } = useProfile();
  const [activeTab, setActiveTab] = useState<"daily" | "community">("daily");
  const [verdict, setVerdict] = useState<VerdictType>(null);
  const [reasoning, setReasoning] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loadingScenario, setLoadingScenario] = useState(true);

  useEffect(() => {
    const fetchScenario = async () => {
      try {
        const { data, error } = await supabase
          .from("scenarios")
          .select("*")
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
          
        if (data) setScenario(data as Scenario);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingScenario(false);
      }
    };
    fetchScenario();
  }, []);

  // Validation: Must select a verdict and reasoning must be >= 15 characters
  const isFormValid = verdict !== null && reasoning.trim().length >= 15;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid && profile && scenario) {
      setIsSubmitted(true);
      try {
        await supabase.from("attempts").insert({
          user_id: profile.id,
          scenario_id: scenario.id,
          user_reasoning: reasoning,
          ai_score: 85,
        });
        refreshProfile();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleReset = () => {
    setVerdict(null);
    setReasoning("");
    setIsSubmitted(false);
    setIsFlagged(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-[#0F172A]">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Header & Mode Toggle */}
        <header className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl">
              Daily MIL Challenge <span className="text-[#64748B] text-2xl font-semibold block sm:inline mt-1 sm:mt-0">— August 2026</span>
            </h1>
            <p className="mt-2 text-base text-[#64748B]">
              Analyze claims, explain your reasoning, and get AI Coach feedback.
            </p>
          </div>

          <div className="flex bg-slate-200 p-1 rounded-xl self-start md:self-end">
            <button
              onClick={() => setActiveTab("daily")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all min-h-[48px] ${
                activeTab === "daily"
                  ? "bg-white text-[#0F172A] shadow-sm"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Daily Curated Challenge
            </button>
            <button
              onClick={() => setActiveTab("community")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all min-h-[48px] ${
                activeTab === "community"
                  ? "bg-white text-[#0F172A] shadow-sm"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Community Questions Bank
            </button>
          </div>
        </header>

        {/* Scenario Display Card */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 relative">
          {/* Flag Button */}
          <div className="absolute top-4 right-4 group">
            <button
              onClick={() => setIsFlagged(true)}
              className={`p-2 rounded-full min-h-[48px] min-w-[48px] flex items-center justify-center transition-colors ${
                isFlagged ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600"
              }`}
              aria-label="Flag Scenario (Safety Net)"
            >
              <AlertTriangle className="h-5 w-5" />
            </button>
            {/* Tooltip for desktop */}
            <div className="absolute hidden group-hover:block right-0 top-14 w-48 p-2 bg-[#0F172A] text-white text-xs rounded shadow-lg z-10 text-center pointer-events-none">
              Report claim (3 reports auto-quarantines item)
            </div>
          </div>

          {loadingScenario ? (
            <div className="animate-pulse flex flex-col gap-4">
              <div className="h-6 bg-slate-200 rounded w-1/4"></div>
              <div className="h-24 bg-amber-50 rounded-r-lg border-l-4 border-amber-400"></div>
            </div>
          ) : scenario ? (
            <>
              <div className="flex flex-wrap gap-2 mb-4 pr-12">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0F766E]/10 text-[#0F766E] uppercase">
                  Category: {scenario.category.replace("_", " ")}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                  Source: {scenario.title}
                </span>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                <p className="text-lg text-slate-800 font-medium italic">
                  "{scenario.body_context || scenario.title}"
                </p>
              </div>
            </>
          ) : (
            <p>No scenarios found.</p>
          )}
        </section>

        {/* Conditional Rendering: Form vs Feedback */}
        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.section
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8"
            >
              <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Verdict Selector */}
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A] mb-4">1. What is your initial assessment?</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => setVerdict("fake")}
                      className={`flex flex-col items-center justify-center p-4 min-h-[48px] rounded-xl border-2 transition-all ${
                        verdict === "fake"
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <ShieldAlert className="h-6 w-6 mb-2" />
                      <span className="font-semibold text-center">Likely Fake / Scam</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setVerdict("real")}
                      className={`flex flex-col items-center justify-center p-4 min-h-[48px] rounded-xl border-2 transition-all ${
                        verdict === "real"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <CheckCircle className="h-6 w-6 mb-2" />
                      <span className="font-semibold text-center">Likely Real / Verified</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVerdict("more_evidence")}
                      className={`flex flex-col items-center justify-center p-4 min-h-[48px] rounded-xl border-2 transition-all ${
                        verdict === "more_evidence"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <HelpCircle className="h-6 w-6 mb-2" />
                      <span className="font-semibold text-center">Needs More Evidence</span>
                    </button>
                  </div>
                </div>

                {/* Reasoning Text Area */}
                <div>
                  <label htmlFor="reasoning" className="block text-xl font-bold text-[#0F172A] mb-3">
                    2. Explain your reasoning in your own words (Required):
                  </label>
                  <p className="text-sm text-slate-500 mb-3">
                    Bare "True/False" clicks are not enough. Elaborate so our AI Coach can evaluate your thinking. (Minimum 15 characters)
                  </p>
                  <textarea
                    id="reasoning"
                    rows={5}
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    placeholder="What specific red flags, language patterns, or missing sources make you think this?..."
                    className="w-full p-4 rounded-xl border border-slate-300 focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 transition-all resize-none text-[#0F172A]"
                    required
                  />
                  <div className="flex justify-between items-center mt-2 text-xs">
                    <span className={reasoning.trim().length < 15 && reasoning.trim().length > 0 ? "text-amber-600 font-semibold" : "text-slate-400"}>
                      {reasoning.trim().length} / 15 minimum characters
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg min-h-[48px] flex items-center justify-center gap-2 transition-all ${
                      isFormValid
                        ? "bg-[#EA580C] text-white hover:bg-[#D94E06] hover:shadow-lg hover:-translate-y-0.5"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <Send className="h-5 w-5" />
                    Submit Reasoning for AI Coach Evaluation
                  </button>
                </div>
              </form>
            </motion.section>
          ) : (
            /* AI Coach Feedback Card */
            <motion.section
              key="feedback"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl border border-[#0F766E]/20 shadow-lg p-6 sm:p-8 overflow-hidden relative"
            >
              {/* Decorative top border */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#0F766E] to-[#EA580C]" />
              
              <div className="flex items-center gap-3 mb-6 mt-2">
                <div className="bg-emerald-100 p-2 rounded-full">
                  <Check className="h-6 w-6 text-emerald-700" />
                </div>
                <h2 className="text-2xl font-bold text-[#0F172A]">AI Evaluation Result</h2>
              </div>

              <div className="mb-6">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                  <ShieldAlert className="h-5 w-5 text-emerald-600" />
                  Correct Assessment — Highly Suspicious
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-[#0F172A] mb-2 flex items-center gap-2">
                    <Info className="h-5 w-5 text-[#0F766E]" />
                    Coach Feedback on Your Reasoning:
                  </h3>
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 text-slate-700 leading-relaxed text-base italic">
                    "You correctly identified the artificial urgency ('before midnight') and the chain-forwarding requirement as classic phishing patterns. Your analysis of the suspicious URL behavior perfectly aligns with how scammers try to bypass logical scrutiny through induced panic."
                  </div>
                </div>

                {/* Key Takeaway / Lesson Box */}
                <div className="bg-[#0F172A] text-white p-6 rounded-xl shadow-md border border-slate-800 flex flex-col sm:flex-row items-start gap-4">
                  <div className="bg-[#EA580C]/20 p-3 rounded-lg shrink-0">
                    <Flag className="h-6 w-6 text-[#EA580C]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1 text-amber-400">Pro Tip</h4>
                    <p className="text-slate-300 leading-relaxed text-sm sm:text-base">
                      Legitimate government or university portals never require forwarding messages on WhatsApp to unlock benefits. Always verify offers directly on the official `.gov` or `.edu` website by typing the address yourself.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-white border-2 border-slate-200 text-[#0F172A] hover:bg-slate-50 hover:border-slate-300 font-bold rounded-xl transition-all min-h-[48px] flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="h-5 w-5" />
                  Try Another Challenge
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

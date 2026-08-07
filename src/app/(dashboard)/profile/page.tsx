"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Settings, 
  Shield, 
  SearchCheck, 
  Users, 
  Lock, 
  User, 
  Bell, 
  ShieldAlert, 
  ChevronRight 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

export default function ProfilePage() {
  const { profile } = useProfile();
  const [phishingScore, setPhishingScore] = useState(92);
  const [sourceScore, setSourceScore] = useState(78);
  const [deepfakeScore, setDeepfakeScore] = useState(64);

  useEffect(() => {
    const fetchAttempts = async () => {
      if (!profile || profile.id === "demo-user-id") return;
      
      try {
        const { data, error } = await supabase
          .from("attempts")
          .select("ai_score, scenarios(category)")
          .eq("user_id", profile.id);
          
        if (data && data.length > 0) {
          let pTotal = 0, pCount = 0;
          let sTotal = 0, sCount = 0;
          let dTotal = 0, dCount = 0;
          
          data.forEach((a: any) => {
            const cat = a.scenarios?.category;
            const score = a.ai_score || 0;
            if (cat === "phishing") { pTotal += score; pCount++; }
            if (cat === "source_checking") { sTotal += score; sCount++; }
            if (cat === "deepfake") { dTotal += score; dCount++; }
          });
          
          if (pCount > 0) setPhishingScore(Math.round(pTotal / pCount));
          if (sCount > 0) setSourceScore(Math.round(sTotal / sCount));
          if (dCount > 0) setDeepfakeScore(Math.round(dTotal / dCount));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchAttempts();
  }, [profile]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900 pb-20">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* User Header & Level Card */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-70"></div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-indigo-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center shrink-0">
                <span className="text-3xl font-bold text-indigo-700">MS</span>
              </div>
              
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {profile?.full_name || "Maria Santos"}
                </h1>
                <p className="text-lg font-medium text-teal-700 mt-1">
                  Level {profile?.level || 4} · Media Literacy Explorer
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm font-medium">
                  <span className="text-slate-500">Member since August 2026</span>
                  <span className="bg-slate-900 text-white px-3 py-1 rounded-full shadow-sm">
                    {(profile?.total_points || 1250).toLocaleString()} PTS
                  </span>
                </div>
              </div>
            </div>
            
            {/* Settings Button (48x48px min target) */}
            <button 
              className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 self-end md:self-start"
              aria-label="Settings"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column */}
          <div className="space-y-8">
            
            {/* The Learning Curve Graph */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
              <h2 className="text-xl font-bold mb-6 text-slate-900">Your Critical Reasoning Trajectory</h2>
              
              {/* Custom SVG Line Chart */}
              <div className="relative w-full h-64 mt-4">
                {/* Y-Axis labels */}
                <div className="absolute top-0 bottom-8 left-0 flex flex-col justify-between text-xs font-medium text-slate-400">
                  <span>100</span>
                  <span>75</span>
                  <span>50</span>
                  <span>25</span>
                  <span>0</span>
                </div>
                
                {/* Graph Area */}
                <div className="absolute top-2 bottom-8 left-8 right-0 border-l border-b border-slate-200">
                  {/* Grid Lines */}
                  <div className="absolute w-full top-0 border-t border-slate-100 border-dashed"></div>
                  <div className="absolute w-full top-1/4 border-t border-slate-100 border-dashed"></div>
                  <div className="absolute w-full top-2/4 border-t border-slate-100 border-dashed"></div>
                  <div className="absolute w-full top-3/4 border-t border-slate-100 border-dashed"></div>
                  
                  {/* The SVG Curve (55% -> 65% -> 75% -> 88%) */}
                  <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
                    <motion.path 
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      d="M 0,45% C 25%,45% 25%,35% 33%,35% C 45%,35% 55%,25% 66%,25% C 75%,25% 85%,12% 100%,12%" 
                      fill="none" 
                      stroke="#0F766E" 
                      strokeWidth="4" 
                      strokeLinecap="round"
                    />
                    
                    {/* Data Points */}
                    <motion.circle initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} cx="0" cy="45%" r="6" fill="#0F172A" />
                    <motion.circle initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} cx="33%" cy="35%" r="6" fill="#0F172A" />
                    <motion.circle initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.0 }} cx="66%" cy="25%" r="6" fill="#0F172A" />
                    <motion.circle initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.4 }} cx="100%" cy="12%" r="8" fill="#0F766E" className="drop-shadow-md" />
                  </svg>
                </div>
                
                {/* X-Axis labels */}
                <div className="absolute bottom-0 left-8 right-0 flex justify-between text-xs font-bold text-slate-500">
                  <span className="-translate-x-1/2">Week 1</span>
                  <span className="-translate-x-1/2 ml-[33%] absolute">Week 2</span>
                  <span className="-translate-x-1/2 ml-[66%] absolute">Week 3</span>
                  <span className="-translate-x-1/2 ml-[100%] absolute text-teal-700">Week 4</span>
                </div>
              </div>
            </section>

            {/* Account & Preferences List */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <h2 className="sr-only">Account Settings</h2>
              <div className="flex flex-col">
                <button className="flex items-center justify-between w-full p-4 min-h-[64px] hover:bg-slate-50 transition-colors border-b border-slate-100 text-left focus:outline-none focus:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                      <User className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-slate-800">Personal Information & Email</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
                
                <button className="flex items-center justify-between w-full p-4 min-h-[64px] hover:bg-slate-50 transition-colors border-b border-slate-100 text-left focus:outline-none focus:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                      <Bell className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-slate-800">Notification & Daily Reminders</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
                
                <button className="flex items-center justify-between w-full p-4 min-h-[64px] hover:bg-slate-50 transition-colors text-left focus:outline-none focus:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-slate-800">Privacy, Security & Data Export</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </section>

          </div>

          {/* Right Column */}
          <div className="space-y-8">
            
            {/* Skill Strengths & Deficits Card */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
              <h2 className="text-xl font-bold mb-6 text-slate-900">Skill Competency Breakdown</h2>
              
              <div className="space-y-6">
                {/* Skill 1 */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-bold text-slate-700">Phishing & Scam Defense</span>
                    <span className="font-bold text-teal-700">{phishingScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${phishingScore}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="bg-teal-600 h-full rounded-full"
                    />
                  </div>
                </div>

                {/* Skill 2 */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-bold text-slate-700">Source Verification</span>
                    <span className="font-bold text-teal-700">{sourceScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${sourceScore}%` }}
                      transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                      className="bg-teal-500 h-full rounded-full"
                    />
                  </div>
                </div>

                {/* Skill 3 (Area for growth) */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-bold text-slate-700">Deepfake Detection</span>
                    <span className="font-bold text-amber-600">{deepfakeScore}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${deepfakeScore}%` }}
                      transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                      className="bg-amber-500 h-full rounded-full"
                    />
                  </div>
                  <p className="text-xs text-amber-700 font-medium mt-2">
                    Suggested area for next practice session.
                  </p>
                </div>
              </div>
            </section>

            {/* Digital Badges Grid */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">Earned Credentials</h2>
                <span className="text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  3 of 12 Unlocked
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                
                {/* Badge 1 */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center mb-3 shadow-sm">
                    <Shield className="w-8 h-8" />
                  </div>
                  <span className="font-bold text-slate-900 text-sm text-center leading-tight">Bot Buster</span>
                </div>

                {/* Badge 2 */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-teal-700 text-white flex items-center justify-center mb-3 shadow-sm">
                    <SearchCheck className="w-8 h-8" />
                  </div>
                  <span className="font-bold text-slate-900 text-sm text-center leading-tight">Source Sleuth</span>
                </div>

                {/* Badge 3 */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center mb-3 shadow-sm">
                    <Users className="w-8 h-8" />
                  </div>
                  <span className="font-bold text-slate-900 text-sm text-center leading-tight">Ripple Starter</span>
                </div>

                {/* Badge 4 (Locked) */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl opacity-60 grayscale cursor-not-allowed">
                  <div className="w-16 h-16 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center mb-3 border-2 border-slate-300 border-dashed">
                    <Lock className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-slate-500 text-sm text-center leading-tight">Deepfake Detective</span>
                </div>

              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

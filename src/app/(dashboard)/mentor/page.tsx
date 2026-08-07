"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  UploadCloud, 
  CheckCircle2, 
  FileImage, 
  Users, 
  FileText, 
  Lightbulb, 
  ArrowRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/useProfile";

export default function MentorHub() {
  const { profile } = useProfile();
  const [sessionsCount, setSessionsCount] = useState(42);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchRippleCount = async () => {
      if (!profile || profile.id === "demo-user-id") return;
      
      try {
        const { count, error } = await supabase
          .from("taught_sessions")
          .select("*", { count: "exact", head: true })
          .eq("mentor_id", profile.id);
          
        if (count !== null) setSessionsCount(count);
      } catch (err) {
        console.error(err);
      }
    };
    fetchRippleCount();
  }, [profile]);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header & Active Mentor Badge */}
        <header className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                Mentor Hub & Ripple Tree
              </h1>
              <p className="text-lg text-slate-600 mt-2 max-w-2xl">
                Your wisdom ripples through the community. Watch as your seeds of knowledge grow into a forest of critical thinkers.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full font-semibold text-sm shadow-sm">
              <span>✨</span> Community Beacon ({sessionsCount} People Reached)
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Column (Tree & Dropzone) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* The Visual Knowledge Tree */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[400px] flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Your Knowledge Tree
                </h2>
                <div className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                  {sessionsCount} Total Secondary Learners Reached
                </div>
              </div>
              
              <div className="flex-1 relative bg-slate-50 p-8 flex items-center justify-center min-h-[350px]">
                {/* Decorative connecting lines (Simplified SVG for visual rep) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                  <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                  <line x1="50%" y1="50%" x2="50%" y2="20%" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                  <line x1="50%" y1="50%" x2="75%" y2="25%" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
                  
                  {/* Secondary branches */}
                  <line x1="25%" y1="25%" x2="15%" y2="15%" stroke="#94a3b8" strokeWidth="1" />
                  <line x1="25%" y1="25%" x2="35%" y2="10%" stroke="#94a3b8" strokeWidth="1" />
                  
                  <line x1="75%" y1="25%" x2="85%" y2="15%" stroke="#94a3b8" strokeWidth="1" />
                  <line x1="75%" y1="25%" x2="90%" y2="35%" stroke="#94a3b8" strokeWidth="1" />
                </svg>

                {/* You (Center Node) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <motion.div
                    animate={{
                      boxShadow: ["0px 0px 0px 0px rgba(79, 70, 229, 0.4)", "0px 0px 0px 20px rgba(79, 70, 229, 0)"],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    className="w-20 h-20 bg-indigo-900 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-xl border-4 border-white"
                  >
                    You
                  </motion.div>
                </div>

                {/* Level 1 Nodes */}
                <div className="absolute top-[25%] left-[25%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg border-2 border-white">
                    Mom
                  </div>
                </div>
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg border-2 border-white">
                    Alex
                  </div>
                </div>
                <div className="absolute top-[25%] left-[75%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg border-2 border-white text-center leading-tight">
                    Grandma
                  </div>
                </div>

                {/* Level 2 Nodes (Secondary) */}
                <div className="absolute top-[15%] left-[15%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-8 h-8 bg-teal-500 rounded-full shadow-md border-2 border-white"></div>
                </div>
                <div className="absolute top-[10%] left-[35%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-8 h-8 bg-teal-500 rounded-full shadow-md border-2 border-white"></div>
                </div>
                
                <div className="absolute top-[15%] left-[85%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-8 h-8 bg-teal-500 rounded-full shadow-md border-2 border-white"></div>
                </div>
                <div className="absolute top-[35%] left-[90%] -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-8 h-8 bg-teal-500 rounded-full shadow-md border-2 border-white"></div>
                </div>
                
              </div>
            </section>

            {/* Offline Teaching Verification Portal */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Verify an Offline Teaching Session</h2>
                <p className="text-slate-600">
                  Taught a friend or family member offline? Upload a photo or short video clip (&lt;60s) of your session to verify your impact badge.
                </p>
              </div>

              <div 
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer group"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">Click to upload or drag and drop</p>
                    <p className="text-sm text-slate-500 mt-1">SVG, PNG, JPG, or MP4 (max. 800x400px)</p>
                  </div>
                </div>
              </div>

              {selectedFile && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex flex-col sm:flex-row items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg p-4 gap-4"
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                    <div className="bg-emerald-100 p-2 rounded-md shrink-0">
                      <FileImage className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-emerald-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready for upload
                      </p>
                    </div>
                  </div>
                  <button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shrink-0 shadow-sm">
                    Submit Proof for +100 PTS
                  </button>
                </motion.div>
              )}
            </section>

          </div>

          {/* Side Column (Nutrition Label & Quick Actions) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Media Nutrition Diet Label */}
            <section className="bg-white border-[3px] border-black p-5 font-sans relative">
              <h2 className="text-4xl font-black uppercase tracking-tighter border-b-[8px] border-black pb-2 mb-2">
                Nutrition Facts
              </h2>
              <p className="text-sm font-bold border-b-4 border-black pb-1 mb-3">
                Your Media Diet Health
              </p>

              <div className="space-y-3 font-medium">
                
                {/* Item */}
                <div className="flex justify-between items-end border-b border-black pb-1">
                  <div>
                    <span className="font-bold text-lg">Fact-Checking Stamina</span>
                  </div>
                  <span className="font-bold text-lg">85%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                  <div className="bg-black h-full w-[85%] rounded-full"></div>
                </div>

                {/* Item */}
                <div className="flex justify-between items-center border-b border-black pb-2 pt-2">
                  <span className="font-bold">Critical Thinking Calories</span>
                  <span className="font-bold bg-slate-900 text-white px-2 py-0.5 rounded text-sm">HIGH</span>
                </div>

                {/* Item */}
                <div className="flex justify-between items-center border-b border-black pb-2 pt-2">
                  <span className="font-bold">Propaganda Consumed</span>
                  <span className="font-bold text-emerald-600">0g</span>
                </div>

                {/* Item */}
                <div className="flex justify-between items-center border-b border-black pb-2 pt-2">
                  <span className="font-bold">Verified Sources Shared</span>
                  <span className="font-bold text-lg">14 Articles</span>
                </div>

                {/* Item */}
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-indigo-700">Ripple Mentorship Score</span>
                  <span className="font-bold text-indigo-700">3 Mentees</span>
                </div>

              </div>

              <div className="border-t-[8px] border-black mt-4 pt-2 text-xs leading-tight text-slate-600">
                * Percent Daily Values are based on a consistent routine of questioning sources, reading past headlines, and sharing verified facts.
              </div>
            </section>

            {/* Quick Actions */}
            <div className="space-y-4">
              
              {/* Pending Reviews */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-indigo-900">Pending Reviews</h3>
                    <p className="text-sm text-indigo-700 mt-1">2 incoming answers from mentees need your feedback.</p>
                  </div>
                </div>
                <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                  Review & Add Mentor Take <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Submit to Questions Bank */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-amber-100 text-amber-600 p-2 rounded-lg">
                    <Lightbulb className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-900">Questions Bank</h3>
                    <p className="text-sm text-amber-700 mt-1">Found a tricky piece of misinformation? Turn it into a scenario.</p>
                  </div>
                </div>
                <button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
                  Submit New Scenario
                </button>
              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

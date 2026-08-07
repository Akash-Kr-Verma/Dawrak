"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Play,
  List,
  CheckCircle,
  Clock,
  Lock,
  ChevronDown,
  Sparkles,
  Users,
  Compass,
  ArrowRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";

interface SubLesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
}

interface Module {
  id: number;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "active" | "locked";
  progress?: number;
  tag?: string;
  lessons: SubLesson[];
}

const modulesData: Module[] = [
  {
    id: 1,
    title: "Module 1: Checking the Source",
    description: "Learn to verify media source metadata, publisher credentials, and cross-reference information.",
    status: "completed",
    progress: 100,
    tag: "✨ Ready to Mentor Offline",
    lessons: [
      { id: "1-1", title: "Identifying Publisher Metadata", duration: "5 mins", completed: true },
      { id: "1-2", title: "Cross-referencing Independent Sources", duration: "8 mins", completed: true },
      { id: "1-3", title: "Offline Verification Techniques", duration: "6 mins", completed: true }
    ]
  },
  {
    id: 2,
    title: "Module 2: Decoding Headlines & Emotion",
    description: "Analyze clickbait, loaded keywords, framing techniques, and emotional manipulation.",
    status: "in-progress",
    progress: 35,
    lessons: [
      { id: "2-1", title: "The Outrage Formula in Social Feeds", duration: "6 mins", completed: true },
      { id: "2-2", title: "Recognizing Framing and Loaded Headlines", duration: "9 mins", completed: false },
      { id: "2-3", title: "Understanding Bias and Sensation", duration: "7 mins", completed: false }
    ]
  },
  {
    id: 3,
    title: "Module 3: Spotting Deepfakes",
    description: "Detect synthetic audio and video anomalies, AI artifacts, and generative media tells.",
    status: "active",
    progress: 0,
    lessons: [
      { id: "3-1", title: "The Basics of Generative Audio Models", duration: "7 mins", completed: false },
      { id: "3-2", title: "Spotting Deepfake Video Anomalies", duration: "10 mins", completed: false },
      { id: "3-3", title: "Metadata Inspection for AI Files", duration: "8 mins", completed: false }
    ]
  },
  {
    id: 4,
    title: "Module 4: Phishing & Scam Defense",
    description: "Protect your accounts and data from social engineering attempts and spoofed messages.",
    status: "locked",
    progress: 0,
    lessons: [
      { id: "4-1", title: "SMS and Domain Spoofing Vectors", duration: "8 mins", completed: false },
      { id: "4-2", title: "Recognizing High-Urgency Language", duration: "7 mins", completed: false }
    ]
  }
];

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState<"detail" | "video">("detail");
  const [expandedModule, setExpandedModule] = useState<number | null>(2); // Default to Module 2 (In Progress)

  const toggleAccordion = (id: number, status: string) => {
    if (status === "locked") return;
    setExpandedModule(expandedModule === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-[#0F172A]">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* User Welcome & Header Banner */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl">
                Good afternoon, Changemaker
              </h1>
              <p className="mt-2 text-base text-[#64748B] max-w-xl">
                Master critical media literacy and mentor your community.
              </p>
            </div>
            
            {/* Verification Stats */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm self-start md:self-center">
              <div className="p-3 bg-[#0F766E]/10 rounded-lg text-[#0F766E]">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs text-[#64748B] font-medium uppercase tracking-wider">Level Progress</div>
                <div className="text-xl font-bold text-[#0F172A]">Tier 3 Contributor</div>
              </div>
            </div>
          </div>
        </header>

        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Main learning content area */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            
            {/* Hero Video Card */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EA580C]/10 text-[#EA580C] uppercase tracking-wider">
                    Current Module
                  </span>
                  <h2 className="mt-2 text-xl font-bold text-[#0F172A]">
                    Chapter 3: Spotting Deepfakes & Synthetic Media
                  </h2>
                </div>

                {/* View toggles */}
                <div className="flex bg-slate-100 p-1 rounded-lg self-start">
                  <button
                    onClick={() => setActiveTab("detail")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 min-h-[36px] ${
                      activeTab === "detail"
                        ? "bg-white text-[#0F172A] shadow-sm"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab("video")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 min-h-[36px] ${
                      activeTab === "video"
                        ? "bg-white text-[#0F172A] shadow-sm"
                        : "text-[#64748B] hover:text-[#0F172A]"
                    }`}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Video Player
                  </button>
                </div>
              </div>

              {/* Toggle Content panel */}
              <div className="p-6">
                {activeTab === "video" ? (
                  /* Embed video view */
                  <div className="space-y-4">
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-inner">
                      <iframe
                        className="absolute inset-0 h-full w-full border-0"
                        src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                        title="Chapter Video Lesson"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <div className="text-xs text-[#64748B] flex items-center justify-between px-1">
                      <span>Educational Resource Link</span>
                      <button 
                        onClick={() => setActiveTab("detail")}
                        className="text-[#0F766E] hover:underline font-semibold min-h-[32px]"
                      >
                        Show Details
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Detail overview card */
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                      <div className="w-full sm:w-1/3 aspect-video relative rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden group">
                        <div className="absolute inset-0 bg-cover bg-center filter brightness-90 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600')]"></div>
                        <button
                          onClick={() => setActiveTab("video")}
                          className="relative z-10 p-3 bg-white/95 rounded-full text-[#EA580C] shadow-lg group-hover:scale-110 transition-transform duration-200 flex items-center justify-center min-h-[48px] min-w-[48px]"
                          aria-label="Start lesson video"
                        >
                          <Play className="h-6 w-6 fill-current" />
                        </button>
                      </div>
                      <div className="flex-1 space-y-3">
                        <p className="text-sm text-[#64748B] leading-relaxed">
                          AI tools make it easy to synthesize voices and faces. In this chapter, learn to spot deepfake telltale signs, including unnatural blinking, lighting artifacts, and metadata issues.
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs font-semibold text-[#0F172A]">
                          <span className="flex items-center gap-1"><BookOpen className="h-4 w-4 text-[#0F766E]" /> 7 Lessons</span>
                          <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-[#0F766E]" /> 45 Mins</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress details */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center text-xs font-semibold mb-2">
                        <span className="text-[#0F766E]">Current Progress</span>
                        <span className="text-[#0F172A]">60% Complete (4/7 Lessons)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#0F766E] h-2.5 rounded-full transition-all duration-500" 
                          style={{ width: "60%" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Resume module bottom actions bar */}
                <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-between items-center pt-6 border-t border-slate-100">
                  <div className="text-xs text-[#64748B] text-center sm:text-left">
                    Up Next: <span className="font-semibold text-[#0F172A]">Lesson 5: Visual Tell Sign Analysis</span>
                  </div>
                  <button
                    onClick={() => setActiveTab("video")}
                    className="w-full sm:w-auto px-6 py-3 bg-[#EA580C] hover:bg-[#D94E06] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    Resume Module
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>

            {/* Curriculum Accordion section */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-[#0F172A] px-1 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#0F766E]" />
                Curriculum Modules
              </h2>

              <div className="space-y-3">
                {modulesData.map((module) => {
                  const isOpen = expandedModule === module.id;
                  const isLocked = module.status === "locked";
                  const isInProgress = module.status === "in-progress";
                  const isCompleted = module.status === "completed";
                  const isActiveStatus = module.status === "active";

                  return (
                    <article
                      key={module.id}
                      className={`border rounded-xl bg-white overflow-hidden transition-all duration-200 ${
                        isLocked 
                          ? "border-slate-200 bg-slate-50/50" 
                          : "border-slate-200 hover:border-slate-300 shadow-sm"
                      }`}
                    >
                      {/* Accordion header button */}
                      <button
                        onClick={() => toggleAccordion(module.id, module.status)}
                        className={`w-full flex items-center justify-between text-left p-5 min-h-[48px] focus:outline-none focus:bg-slate-50/80 ${
                          isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                        }`}
                        aria-expanded={isOpen}
                        disabled={isLocked}
                      >
                        <div className="flex items-start gap-4 mr-2">
                          <div className="mt-1">
                            {isCompleted && (
                              <CheckCircle className="h-5 w-5 text-emerald-600 fill-emerald-50" />
                            )}
                            {(isInProgress || isActiveStatus) && (
                              <Clock className="h-5 w-5 text-[#0F766E]" />
                            )}
                            {isLocked && (
                              <Lock className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-[#0F172A] text-base md:text-lg flex flex-wrap items-center gap-2">
                              {module.title}
                              
                              {/* Pill badges */}
                              {isCompleted && (
                                <span className="inline-flex text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                                  Completed
                                </span>
                              )}
                              {isInProgress && (
                                <span className="inline-flex text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#0F766E]/10 text-[#0F766E] uppercase tracking-wider">
                                  In Progress
                                </span>
                              )}
                              {isActiveStatus && (
                                <span className="inline-flex text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
                                  Active
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-[#64748B] mt-1 font-normal line-clamp-1">
                              {module.description}
                            </p>

                            {/* Specialty highlights */}
                            {module.tag && (
                              <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                                {module.tag}
                              </span>
                            )}
                          </div>
                        </div>

                        {!isLocked && (
                          <ChevronDown
                            className={`h-5 w-5 text-slate-400 transition-transform duration-200 shrink-0 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </button>

                      {/* Accordion content area */}
                      <AnimatePresence initial={false}>
                        {isOpen && !isLocked && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                          >
                            <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4">
                              <p className="text-sm text-[#64748B] leading-relaxed">
                                {module.description}
                              </p>

                              {/* Lesson syllabus details list */}
                              <div className="space-y-2">
                                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                                  Syllabus Outline
                                </h4>
                                <div className="divide-y divide-slate-100">
                                  {module.lessons.map((lesson) => (
                                    <div
                                      key={lesson.id}
                                      className="flex items-center justify-between py-3 text-sm"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`h-2 w-2 rounded-full ${lesson.completed ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                        <span className={lesson.completed ? "text-slate-500 line-through" : "text-[#0F172A] font-medium"}>
                                          {lesson.title}
                                        </span>
                                      </div>
                                      <span className="text-xs text-[#64748B]">{lesson.duration}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* In progress action button */}
                              {isInProgress && (
                                <div className="flex justify-end pt-3">
                                  <button 
                                    className="px-5 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-semibold rounded-lg shadow transition-colors duration-150 flex items-center gap-2 min-h-[48px]"
                                    aria-label="Continue Lesson"
                                  >
                                    Continue Lesson
                                    <ArrowRight className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Column details and insights */}
          <aside className="lg:col-span-5 xl:col-span-4 space-y-8">
            
            {/* Honest Diagnostic Card */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[#0F766E]">
                <Sparkles className="h-5 w-5" />
                <h2 className="font-bold text-lg text-[#0F172A]">
                  Diagnostic Competency Insight
                </h2>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <div className="flex items-start gap-2.5 text-amber-700 bg-amber-50 p-2.5 rounded-lg text-xs font-semibold border border-amber-100">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                  <span>Verified Competency Assessment</span>
                </div>
                <p className="text-sm text-[#64748B] leading-relaxed">
                  Based on your practice attempts, your score in **Source Verification** is currently your lowest area. We recommend prioritizing Module 1 to strengthen your foundation.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setExpandedModule(1)}
                  className="w-full px-4 py-2.5 border border-[#0F766E] text-[#0F766E] hover:bg-[#0F766E]/5 font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 min-h-[48px]"
                  aria-label="Go to recommended module"
                >
                  Go to Recommended Module
                </button>
              </div>
            </section>

            {/* Footer Community Banner */}
            <section className="bg-[#0F172A] p-6 rounded-2xl text-white shadow-lg space-y-6 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Users className="h-5 w-5 text-[#EA580C]" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Questions Bank
                </span>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-extrabold tracking-tight">
                  Explore Community-Mastered Situations
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Browse real-world WhatsApp forwards and news claims analyzed and tagged by verified community mentors in our Questions Bank.
                </p>
              </div>

              <div className="pt-2">
                <button
                  className="w-full px-5 py-3 bg-[#EA580C] hover:bg-[#D94E06] text-white font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-md min-h-[48px]"
                  aria-label="Browse Mentor Situations"
                >
                  <Compass className="h-5 w-5 text-white" />
                  Browse Mentor Situations
                </button>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

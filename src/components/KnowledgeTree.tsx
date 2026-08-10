import React, { useId } from 'react';
import Image from 'next/image';

interface SecondaryLearner {
  id: string;
  name: string;
  relation: string; // e.g., 'Family Member', 'Classmate / Friend', 'Community Member'
  moduleName: string;
  isVerified: boolean;
}

interface KnowledgeTreeProps {
  learners: SecondaryLearner[];
  onLogProofClick?: () => void;
}

// Helper to pick the right doodle based on relation string
const getAvatarForRelation = (relation: string): string => {
  const rel = relation.toLowerCase();
  if (rel.includes('family') || rel.includes('mom') || rel.includes('dad')) {
    return '/asset/avatar-family.png';
  }
  if (rel.includes('classmate') || rel.includes('friend') || rel.includes('peer')) {
    return '/asset/avatar-friend.png';
  }
  return '/asset/avatar-friend.png';
};

export const KnowledgeTree: React.FC<KnowledgeTreeProps> = ({ learners, onLogProofClick }) => {
  const filterId = useId();

  return (
    <div className="relative w-full rounded-3xl bg-white p-6 shadow-xl shadow-indigo-950/5 border border-indigo-100/60">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-8">
            <Image
              src="/asset/stat-tree-growth.png"
              alt="Tree Growth"
              fill
              className="object-contain"
            />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Your Knowledge Tree
          </h3>
        </div>

        <button
          onClick={onLogProofClick}
          className="flex items-center gap-2 rounded-full bg-[#7C3AED] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-500/25 transition-all hover:bg-[#6D28D9] active:scale-95"
        >
          <div className="relative h-5 w-5">
            <Image
              src="/asset/icon-photo-proof.png"
              alt="Log Proof"
              fill
              className="object-contain"
            />
          </div>
          Log Teaching Proof
        </button>
      </div>

      {/* Tree Graph Layout */}
      <div className="relative mt-8 flex flex-col items-center">
        {/* Root Node: YOU */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative h-20 w-20 rounded-full p-1 bg-gradient-to-tr from-purple-500 to-pink-400 shadow-xl shadow-purple-500/20 animate-pulse">
            <div className="relative h-full w-full overflow-hidden rounded-full bg-white">
              <Image
                src="/asset/avatar-you-node.png"
                alt="You (Root)"
                fill
                className="object-cover p-1"
              />
            </div>
          </div>
          <span className="mt-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-700 uppercase tracking-wider">
            You (Root)
          </span>
        </div>

        {/* Connecting Lines SVG Layer */}
        <div className="relative w-full my-4 flex justify-center">
          <svg className="w-full h-16 overflow-visible pointer-events-none">
            <defs>
              <linearGradient id="branchGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#A3E635" />
              </linearGradient>
            </defs>
            {/* Center Trunk */}
            <line
              x1="50%"
              y1="0"
              x2="50%"
              y2="100%"
              stroke="url(#branchGrad)"
              strokeWidth="4"
              strokeDasharray="6 6"
              className="animate-[bounce_3s_infinite]"
            />
          </svg>
        </div>

        {/* Children Learner Cards Grid */}
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 z-10">
          {learners.map((learner, index) => {
            const avatarSrc = getAvatarForRelation(learner.relation);

            return (
              <div
                key={learner.id || index}
                className="group relative flex items-start gap-4 rounded-2xl bg-slate-50/80 p-4 border border-slate-200/80 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/10 hover:border-purple-200"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Dynamic PNG Avatar */}
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-purple-50 p-1 border border-purple-100 group-hover:scale-105 transition-transform">
                  <Image
                    src={avatarSrc}
                    alt={learner.name}
                    fill
                    className="object-contain"
                  />
                </div>

                {/* Learner Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-extrabold text-slate-900 truncate text-base">
                      {learner.name}
                    </h4>
                    {learner.isVerified && (
                      <span className="inline-flex items-center rounded-full bg-lime-100 px-2.5 py-0.5 text-xs font-bold text-lime-800">
                        Verified ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {learner.relation}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-purple-600 truncate flex items-center gap-1">
                    <span>📚</span> {learner.moduleName}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Counter Summary */}
      <div className="mt-8 pt-4 border-t border-slate-100 text-center">
        <p className="text-sm font-bold text-slate-500">
          Your Ripple Tree has reached{' '}
          <span className="text-purple-600 font-extrabold">{learners.length} secondary learners</span>.
        </p>
      </div>
    </div>
  );
};

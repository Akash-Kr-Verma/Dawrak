# Play Your Part - Media & Information Literacy App

Welcome to **Play Your Part**, a dynamic Media and Information Literacy (MIL) application developed for the UNESCO hackathon. This app is designed to help users learn to identify misinformation, verify sources, and resist digital manipulation while tracking their progress through an engaging dashboard.

## 🚀 What We've Built So Far (Current Status)

The application currently features a fully functional frontend using Next.js and TailwindCSS, integrated with a live Supabase backend. 

### Key Features Implemented:
1. **Challenge Hub (`/challenge`)**
   - Displays real-world misinformation scenarios directly fetched from the Supabase database.
   - Users can assess if a scenario is "Real", "Fake", or needs "More Evidence", and submit their reasoning.
   - Submissions are logged securely to the `attempts` table.

2. **Profile Analytics (`/profile`)**
   - Fetches the user's historical attempts and dynamically calculates their logic score across categories (Phishing, Deepfake Detection, Source Verification).
   - Features animated progress bars to visually represent skill mastery.
   - Provides a fallback "Demo Changemaker" profile so the UI works flawlessly even during unauthenticated live demos.

3. **Mentor Hub & Ripple Tree (`/mentor`)**
   - Shows the "Ripple Effect" of a user's knowledge by tracking how many people they have taught offline.
   - Dynamically aggregates data from the `taught_sessions` table to reflect live stats.

4. **Persistent Navigation**
   - A clean mobile-first bottom navigation bar that persists across all dashboard views.

## 🛠 Tech Stack
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Database / Backend:** [Supabase](https://supabase.com/)

## 💻 How to Run the App Locally

### 1. Install Dependencies
Make sure you have Node.js installed, then run:
```bash
npm install
```

### 2. Set Up Environment Variables
Create a `.env.local` file in the root of the project and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🗄️ Supabase Setup (For Teammates)
To ensure the frontend works correctly, make sure the following tables exist in your Supabase project:
- `profiles` (id, full_name, avatar_url, total_points, level, created_at)
- `scenarios` (id, title, body_context, category, media_url, verdict, is_community_submitted, submitted_by_profile_id, reports_count, is_hidden, created_at)
- `attempts` (id, user_id, scenario_id, user_reasoning, ai_score, created_at)
- `taught_sessions` (id, mentor_id, scenario_id, student_name, proof_url, visitor_explanation, verified, completed_at)

> **Important hackathon tip:** If queries return empty arrays `[]` without error, ensure Row Level Security (RLS) is disabled for the prototype by running `ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;` in the Supabase SQL editor.

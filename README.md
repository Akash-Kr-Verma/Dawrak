# Play Your Part - Media & Information Literacy App

Welcome to **Play Your Part**, a dynamic Media and Information Literacy (MIL) application developed for the UNESCO hackathon. This app is designed to help users learn to identify misinformation, verify sources, and resist digital manipulation while tracking their progress through an engaging dashboard.

## 🚀 What We've Built So Far (Current Status)

The application currently features a fully functional frontend using Next.js and TailwindCSS, integrated with a live Supabase backend.

### Key Features Implemented:
1. **Challenge Hub (`/challenge`)**
   - Displays real‑world misinformation scenarios fetched from the backend.
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
   - A clean mobile‑first bottom navigation bar that persists across all dashboard views.

### Recent Enhancements (August 2026) 📈
- **Live Internet Claim Engine** (`/api/scenarios/live`):
  - Added `export const dynamic = 'force-dynamic'` and `export const revalidate = 0` to prevent Next.js caching, guaranteeing a fresh claim on every request.
  - Implemented a rotating 5‑item fallback bank so the app still works if the AI API is rate‑limited or unavailable.
  - Integrated Groq (or OpenAI) LLM generation with high temperature for unique, media‑rich Indian and global MIL scenarios.
- **Browser Cache Bypass** in the Challenge page: fetch now uses `{ cache: "no-store" }` to avoid client‑side caching of stale claims.
- **Rich Media Support**: Scenarios can now include images or audio, with placeholder Unsplash images and a playable OGG audio sample.
- **Improved UI**: Dynamic badges, source channel labels, and viral‑reach indicators.

## 🛠 Tech Stack
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Database / Backend:** Supabase

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
# Optional: Groq or OpenAI API key for the live claim engine
GROQ_API_KEY=your_groq_key   # (never committed, ignored by .gitignore)
OPENAI_API_KEY=your_openai_key   # (never committed, ignored by .gitignore)
```
> **Important:** The `.gitignore` file already excludes any `.env*` files, ensuring API keys are never pushed to the repository.

### 3. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## 🗄️ Supabase Setup (For Teammates)
Ensure the following tables exist in your Supabase project:
- `profiles` (id, full_name, avatar_url, total_points, level, created_at)
- `scenarios` (id, title, body_context, category, media_url, verdict, is_community_submitted, submitted_by_profile_id, reports_count, is_hidden, created_at)
- `attempts` (id, user_id, scenario_id, user_reasoning, ai_score, created_at)
- `taught_sessions` (id, mentor_id, scenario_id, student_name, proof_url, visitor_explanation, verified, completed_at)

> **Hackathon tip:** If queries return empty arrays `[]` without error, ensure Row Level Security (RLS) is disabled for the prototype by running `ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;` in the Supabase SQL editor.

## 📚 Learning Modules

The Learn tab runs the 10 finalized modules from `play-your-part-modules-final.md`. Content is authored, not AI-generated, and lives in the database.

### Applying the module system

Run these two files in the Supabase SQL editor, in order. **The Learn tab will show an actionable "module tables not found" message until you do.**

1. `supabase/migrations/0002_learning_modules.sql` — adds `learning_modules`, `module_attempts`, `user_module_progress`, the `learner_signal_profile` view and two helper functions. Additive: it does not touch `scenarios`, `attempts`, or `taught_sessions`, so the Daily Challenge tab keeps working.
2. `supabase/seed_modules.sql` — inserts the 10 modules. Idempotent; safe to re-run after a content edit.

Sanity check afterwards — should return zero rows:

```sql
select * from public.validate_module_sequence();
```

> Unlike the tables above, **leave RLS enabled on `module_attempts`**. It stores learners' written reasoning, which can disclose personal circumstances.

### Editing module content

Modules are authored as typed TypeScript in `src/content/modules/`, one file per module. The `.sql` seed is generated from them:

```bash
npm run seed:modules
```

Then re-run `supabase/seed_modules.sql` in Supabase. Do not hand-edit the generated seed.

`canonical_reasoning` is the one column you cannot casually change: a DB trigger rejects updates to it unless the session explicitly opts in. That is deliberate — it is the fixed explanation the AI grader compares against, and it must never be regenerated by a model. The seed opts in; nothing else does.

### Tests

```bash
npm run test:modules
```

Runs the schema, migration, and seed against PGlite (Postgres compiled to WASM) and unit-tests the grading rubric. No Docker, no Supabase CLI, no network, no credentials.

### Dev preview

With the dev server running, `/learn/preview/<slug>` renders any module straight from the local content files — no database, no auth. Development only; it is excluded from production builds.

---
*This repository contains no secret keys. All credentials are loaded from environment variables that are excluded from version control.*

# AI Interview Prep Kit 🎯

> **Autonomous Full-Stack Application that transforms raw Job Descriptions & Company URLs into personalized, end-to-end interview preparation kits with 100% must-have competency coverage.**

---

## 🌟 Highlights & Key Features

### 1. 🔍 Autonomous Scraping & Company Intelligence
- **Robots.txt Respect**: Checks and obeys robots.txt rules before crawling any domain.
- **SSRF & Security Defense**: Rejects localhost, loopback, private IP subnets (RFC 1918), and AWS metadata endpoints (`169.254.169.254`).
- **Domain Exploration**: Automatically searches for `/about`, `/careers`, `/jobs`, `/company`, `/team`, and culture pages.
- **Public Discussion Insights**: Gathers interview style and company signals while sanitizing inputs.

### 2. 🧠 Intelligent Requirement & Question Pipeline
- **Prompt Injection Hardening**: Crawled web pages and raw job descriptions are isolated in data boundaries, never executed as instructions.
- **Categorized Question Generation**: Generates distinct question pools (Technical Deep Dive, Behavioural, System Design, Company Fit) across 3 difficulty tiers with model answer outlines.
- **Deterministic 100% Must-Have Coverage Loop**: Rather than trusting an LLM to self-evaluate, strict deterministic set arithmetic verifies that every single must-have requirement has at least one assigned question. Any gaps trigger targeted gap-fill passes (up to 3 passes).

### 3. 📅 Deterministic Schedule Allocator
- **Integer Minutes Arithmetic**: Computes daily study plans strictly in whole integer minutes based on question difficulty weighting.
- **Priority-First Staging**: More demanding material (Difficulty 3 and must-have competencies) lands on earlier study days.
- **Full Range Flexibility**: Accurately scales from 1-day crash courses to 60-day deep prep roadmaps.

### 4. 🛠️ Interactive Builder UI
- **Inline Editing Everywhere**: Edit company briefs, questions, and model answers directly in place.
- **Drag-and-Drop Prioritization**: Reorder questions visually within categories.
- **Category Migration**: Move questions seamlessly between Technical, Behavioural, and Domain categories.
- **Add / Delete Custom Content**: Add custom questions or flashcards by hand.
- **Single-Section Regeneration**: Regenerate only the Company Brief, questions of a specific category, or the schedule without losing edits in other sections.
- **Pinned / Edited Persistence**: User edits are marked with badges and survive subsequent section regenerations.

### 5. ⚡ Practice Mode (Spaced Repetition)
- **Interactive Flashcard Stepper**: Flip cards to reveal concise answer explanations.
- **1-5 Confidence Rating Scale**: (🔴 No clue, 🟠 Vague, 🟡 Familiar, 🟢 Good, 🌟 Mastered).
- **Confidence-Weighted Reordering**: Automatically surfaces lower-confidence and unreviewed cards first in subsequent review sessions.
- **Keyboard Navigation**: Press `[Space]` to flip, `[1]` - `[5]` to rate and advance.

### 6. 🎙️ Creative Feature: AI Mock Interview with Resume Integration
- **Resume Upload & Parsing**: Upload PDF / text or paste resume directly.
- **Skill Mapping vs. JD**: Automatically identifies matched strengths and potential gap areas compared to the job requirements.
- **Timed Interview Pressure**: Simulates real interview conditions with a countdown timer per question (60 - 180s).
- **Voice-to-Text Support**: Speak your answer naturally using browser Web Speech API or type it.
- **Instant AI Feedback**: Scores candidate answers (1-10) with actionable strengths and improvement areas.

### 7. 🚀 Batch Evaluation CLI
- Execute automated kit generation across batches of job descriptions for offline grading or benchmarking:
  ```bash
  npm run evaluate -- --input data/sample_cases.json --output data/output_kits.json
  ```
- Complies strictly with Appendix B format.
- Resilient: Continues gracefully after individual failures and produces an error report for failed cases.

---

## 🏗️ Architecture & Decisions

```
┌─────────────────────────────────────────────────────────────┐
│                 Next.js 14 App Router UI                     │
│    (Landing, Auth, Dashboard, Builder, Practice, Mock AI)   │
├─────────────────────────────────────────────────────────────┤
│                  Next.js API Endpoints                      │
│     (/api/auth, /api/kits, /api/practice, /api/mock-interview)│
├─────────────────────────────────────────────────────────────┤
│                   Core Pipeline Layer                       │
│    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│    │Scraper/SSRF  │ → │Gemini LLM    │ → │Deterministic │   │
│    │Engine        │   │Engine        │   │Coverage Check│   │
│    └──────────────┘   └──────────────┘   └──────────────┘   │
│                              │                              │
│                              ▼                              │
│                       ┌──────────────┐                      │
│                       │Deterministic │                      │
│                       │Scheduler     │                      │
│                       └──────────────┘                      │
├─────────────────────────────────────────────────────────────┤
│                MongoDB (Mongoose Schemas)                   │
└─────────────────────────────────────────────────────────────┘
```

### Why Deterministic Code for Coverage & Scheduling?
LLMs are creative and non-deterministic; relying on an LLM to accurately calculate arithmetic or guarantee mathematical sets causes hallucinations and missed requirements. By using **deterministic TypeScript code** for both coverage verification and daily minute allocations, we guarantee 100% mathematical accuracy and adherence to Appendix A schema specifications.

---

## 💻 Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Vanilla CSS tokens + Tailwind CSS with custom glassmorphism & dark theme
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js (Credentials provider with bcrypt password hashing)
- **LLM**: Google Gemini 1.5 Flash (`@google/generative-ai`)
- **Scraping**: Cheerio + Axios + robots-parser
- **Drag-and-Drop**: `@dnd-kit/core` & `@dnd-kit/sortable`
- **CLI Runner**: `tsx` for TypeScript command execution

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 20)
- MongoDB instance (local or MongoDB Atlas connection string)
- Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/))

### 2. Environment Configuration
Create a `.env` or `.env.local` file in the project root:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/interview-prep-kit

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=super-secret-key-change-this-in-production-123456

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Installation
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

Run the automated test suite verifying scheduler arithmetic, coverage verification, SSRF blocking, and schema validation:

```bash
npm test
```

Expected output:
```
======================================================
Results: 28 passed, 0 failed.
======================================================
🎉 ALL TESTS PASSED SUCCESSFULLY!
```

---

## 📊 Batch CLI Evaluation

Run batch kit generation for offline analysis:

```bash
npm run evaluate -- --input data/sample_cases.json --output data/output_kits.json
```

Input file format (`cases.json`):
```json
[
  {
    "id": "case-stripe-backend",
    "jd": "Stripe is looking for a Software Engineer - Backend...",
    "company_url": "https://stripe.com",
    "days": 7
  }
]
```

Output matches Appendix B format with `version`, `generated_at`, and `kits` array.

---

## 📁 Project Structure

```
ai-interview-prep-kit/
├── data/
│   └── sample_cases.json         # Sample batch input cases
├── scripts/
│   └── evaluate.ts               # Batch evaluation CLI runner
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/             # NextAuth & registration endpoints
│   │   │   ├── kits/             # Kit CRUD & single-section regenerate
│   │   │   ├── mock-interview/   # Mock interview start & evaluation
│   │   │   └── practice/         # Practice session progress
│   │   ├── dashboard/            # User dashboard with kit generator
│   │   ├── kits/[id]/            # Interactive Builder UI
│   │   │   ├── mock-interview/   # AI Mock Interview with resume
│   │   │   └── practice/         # Flashcard practice mode
│   │   ├── login/ & register/    # Authentication pages
│   │   ├── globals.css           # Design tokens, themes & utilities
│   │   └── page.tsx              # Landing page
│   ├── components/               # Navbar & AuthProvider components
│   ├── lib/
│   │   ├── auth.ts               # NextAuth configuration
│   │   ├── db.ts                 # MongoDB connection caching
│   │   └── pipeline/             # Scraper, LLM, Coverage, Scheduler
│   ├── models/                   # Mongoose schemas (Kit, User, Practice)
│   └── types/                    # Kit types matching Appendix A & B
└── tests/
    └── run-tests.ts              # Unit and integration test suite
```

---

## 🛡️ License & Credits
Built for the AI Interview Preparation Kit Assignment.

<p align="center">
  <img src="public/InterAi.png" alt="IntervAI Logo" width="120" />
</p>

# IntervAI — AI-Powered Interview Practice Platform

Practice mock interviews with AI-generated questions, record your answers via speech-to-text, and receive instant personalized feedback — all in your browser.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Gemini](https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?logo=google)
![Firebase](https://img.shields.io/badge/Auth-Firebase-ff6000?logo=firebase)
![Drizzle](https://img.shields.io/badge/ORM-Drizzle-C5F74F)
![Neon](https://img.shields.io/badge/DB-Neon_Postgres-00E599?logo=postgresql)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the App](#running-the-app)
- [API Routes](#api-routes)
- [Key Workflows](#key-workflows)
- [Scripts](#scripts)
- [License](#license)

---

## Features

- **AI-Generated Interview Questions** — Powered by Google Gemini 2.5 Flash, questions are tailored to your job position, description, experience level, and chosen difficulty (Beginner / Intermediate / Expert).
- **Speech-to-Text Answer Recording** — Record answers using your microphone with real-time transcription via the Web Speech API.
- **Webcam Integration** — Optional webcam feed during practice sessions to simulate a real interview environment.
- **Instant AI Feedback** — Each answer is evaluated by Gemini AI, returning a rating out of 10 along with constructive feedback.
- **Detailed Feedback Dashboard** — Review question-by-question breakdowns with your answer, the ideal answer, and personalized improvement tips.
- **Authentication & Protected Routes** — Secure sign-in/sign-up with Firebase; dashboard routes are fully protected via middleware.
- **Dark/Light Theme Support** — Toggle between themes using `next-themes`.
- **Responsive Design** — Fully responsive UI built with Tailwind CSS and Radix UI primitives.

---

## Tech Stack

| Layer          | Technology                                                     |
| -------------- | -------------------------------------------------------------- |
| Framework      | [Next.js 14](https://nextjs.org/) (App Router)                |
| Language       | JavaScript / JSX                                               |
| Styling        | [Tailwind CSS](https://tailwindcss.com/) + Radix UI           |
| AI Model       | [Google Gemini 2.5 Flash](https://ai.google.dev/)             |
| Authentication | [Firebase](https://firebase.google.com/)                                    |
| Database       | [Neon Serverless Postgres](https://neon.tech/)                 |
| ORM            | [Drizzle ORM](https://orm.drizzle.team/)                      |
| Speech-to-Text | [react-hook-speech-to-text](https://www.npmjs.com/package/react-hook-speech-to-text) |
| Webcam         | [react-webcam](https://www.npmjs.com/package/react-webcam)    |
| Notifications  | [Sonner](https://sonner.emilkowal.dev/)                       |

---

## Project Structure

```
InterAi/
├── app/
│   ├── layout.js                   # Root layout (Firebase, theme, toaster)
│   ├── page.js                     # Landing / hero page
│   ├── globals.css                 # Global styles
│   ├── (auth)/                     # Firebase auth pages
│   │   ├── sign-in/[[...sign-in]]/page.jsx
│   │   └── sign-up/[[...sign-up]]/page.jsx
│   ├── api/
│   │   ├── interviews/
│   │   │   ├── route.js            # GET (list) / POST (create) interviews
│   │   │   └── [interviewid]/route.js  # GET single interview
│   │   └── feedback/
│   │       └── [interviewid]/route.js  # GET / POST feedback
│   └── dashboard/
│       ├── layout.jsx              # Dashboard layout
│       ├── page.jsx                # Dashboard home
│       ├── _components/            # Header, Footer, AddNewInterview, InterviewList
│       ├── interview/
│       │   └── [interviewid]/
│       │       ├── page.jsx        # Interview detail
│       │       ├── start/page.jsx  # Practice session (questions + recording)
│       │       └── feedback/page.jsx  # Feedback results
│       ├── questions/page.jsx      # Practice questions
│       └── upgrade/page.jsx        # Pricing / upgrade plans
├── components/                     # Shared UI components (Button, Dialog, etc.)
├── lib/utils.js                    # Utility functions (cn helper)
├── utils/
│   ├── db.js                       # Drizzle + Neon Postgres connection
│   ├── Geminimodel.js              # Google Gemini AI chat session config
│   ├── schema.js                   # Drizzle DB schema (mockinterview, userAnswers)
│   └── planData.js                 # Pricing plan definitions
├── middleware.js                    # firebase auth middleware (protects /dashboard)
├── drizzle.config.js               # Drizzle Kit configuration
├── tailwind.config.js
├── next.config.mjs
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** or **yarn**
- A [Neon](https://neon.tech/) Postgres database (or any Postgres instance)
- A [Firebase](https://firebase.google.com/) application (for auth keys)
- A [Google AI Studio](https://aistudio.google.com/) API key (for Gemini)

### Installation

```bash
git clone https://github.com/<your-username>/InterAi.git
cd InterAi
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# firebase Authentication
NEXT_PUBLIC_FIREBASE_API_KEY= your key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN= your domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID= you project ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET= your bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID= your sender ID
NEXT_PUBLIC_FIREBASE_APP_ID= your App ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID= your measurement ID

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Google Gemini AI
NEXT_PUBLIC_KEY_GEMINI=your_gemini_api_key

# Database (Neon Postgres)
DRIZZLE_DB_URL=postgresql://user:password@host/dbname?sslmode=require
```

### Database Setup

Push the Drizzle schema to your Postgres database:

```bash
npm run db-push
```

Optionally open Drizzle Studio to browse your data:

```bash
npm run db-studio
```

### Running the App

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

The app will be available at **http://localhost:3000**.

---

## API Routes

| Method | Endpoint                          | Description                              |
| ------ | --------------------------------- | ---------------------------------------- |
| GET    | `/api/interviews?email=...`       | List all interviews for a user           |
| POST   | `/api/interviews`                 | Create a new mock interview              |
| GET    | `/api/interviews/[interviewid]`   | Get a single interview by mock ID        |
| GET    | `/api/feedback/[interviewid]`     | Get all feedback for an interview        |
| POST   | `/api/feedback/[interviewid]`     | Save a user's answer + AI feedback       |

---

## Key Workflows

### 1. Create a Mock Interview

1. User fills in **Job Position**, **Description**, **Experience**, and **Difficulty Level**.
2. A prompt is sent to **Gemini AI** which returns 5 tailored interview questions in JSON.
3. The questions and metadata are stored in the `mockinterview` table.
4. User is redirected to the interview detail page.

### 2. Practice Session

1. Questions are displayed one at a time with a progress indicator.
2. User enables their **webcam** and **microphone**.
3. Speech is captured in real-time via `react-hook-speech-to-text` and transcribed.
4. On stopping recording, the transcribed answer is sent to **Gemini AI** for evaluation.
5. AI returns a **rating (out of 10)** and **written feedback**, stored in the `userAnswers` table.

### 3. Review Feedback

1. After completing all questions, user navigates to the **Feedback** page.
2. An **overall average rating** is displayed.
3. Each question is expandable, showing: the user's answer, the ideal answer, and AI feedback.

---

## Scripts

| Script            | Command                    | Description                          |
| ----------------- | -------------------------- | ------------------------------------ |
| `dev`             | `npm run dev`              | Start Next.js dev server             |
| `build`           | `npm run build`            | Create production build              |
| `start`           | `npm start`                | Start production server              |
| `lint`            | `npm run lint`             | Run ESLint                           |
| `db-push`         | `npm run db-push`          | Push Drizzle schema to database      |
| `db-studio`       | `npm run db-studio`        | Open Drizzle Studio GUI              |

---


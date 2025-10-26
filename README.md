
# NexHireAI - AI-Powered Skill Assessments

<div align="center">
  <img src="https://raw.githubusercontent.com/firebase/firebase-studio/main/src/assets/logo.svg" alt="NexHireAI Logo" width="120">
  <h1 align="center">NexHireAI</h1>
  <p align="center">
    Unleash human potential with AI-powered skill assessments that go beyond the resume.
  </p>
</div>

---

**NexHireAI** is a revolutionary platform that leverages cutting-edge generative AI to create dynamic, adaptive skill assessments. We move beyond static questionnaires to simulate real-world challenges, providing deep, actionable insights into a candidate's true potential and job readiness for both individuals and businesses.

## ✨ Key Features

- **Dynamic Assessments:** AI-generated tests for over 30 professional roles that adapt to user skill levels, featuring MCQs, short-answer, and live coding challenges.
- **AI-Powered Analytics:** An interactive dashboard visualizes performance, highlighting skill gaps, proficiency levels, and providing a data-driven overview of strengths and weaknesses.
- **Personalized Career Tools:**
    - **AI Job Recommender:** Analyzes user profiles to suggest the best-fit job roles.
    - **AI Skill Master:** Creates a personalized skill matrix and a targeted learning plan.
    - **AI Learning Hub:** Curates articles and videos to help users master new skills.
- **Realistic Code Execution:** An integrated Monaco editor provides a rich coding environment with AI-simulated test case evaluation for instant feedback.
- **Gamification & Engagement:** A built-in system of experience points (XP) and badges to motivate users and track their progress.
- **B2B Recruiter Portal:** (In development) Tools for recruiters to find, assess, and manage talent efficiently.

## 🛠️ Technology Stack

- **Frontend:** [Next.js](https://nextjs.org/) 14, [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [ShadCN UI](https://ui.shadcn.com/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Backend Services:** [Firebase](https://firebase.google.com/) (Authentication, Firestore Database)
- **AI & Generative Features:** [Google Genkit](https://firebase.google.com/docs/genkit) with the [Gemini API](https://ai.google.dev/)

## 🏗️ Architecture Overview

NexHireAI is built on a decoupled architecture that separates the frontend presentation layer from the backend services, ensuring scalability and maintainability.

```
+--------------------------------+
|          User's Browser        |
| (Interacts with the application) |
+--------------------------------+
               |
               v
+--------------------------------+
|       Next.js Frontend         |
| (React, ShadCN, Zustand)       |
+--------------------------------+
     |         ^        |       ^
     | (Auth)  |        |       | (AI Results)
     v         |        v       |
+------------------+  +-------------------+
| Firebase Services|  |  Genkit AI Flows  |
|------------------|  | (Server-Side)     |
| - Authentication |  |-------------------|
| - Firestore DB   |  | - Generate Assess.|
+------------------+  | - Score Assess.   |
                      | - Analyze Profile |
                      +-------------------+
                                 |
                                 v
                       +-------------------+
                       | Google AI Models  |
                       |      (Gemini)     |
                       +-------------------+

```

- **Next.js Frontend:** A modern, server-aware React application that handles all user-facing interfaces, client-side state, and routing.
- **Firebase Services:** Provides the core backend infrastructure. **Firebase Authentication** manages user identity, while **Firestore** serves as the scalable NoSQL database for all application data, including user profiles, roles, and assessment results.
- **Genkit AI Flows:** Server-side TypeScript functions that orchestrate all interactions with Google's AI models. They handle complex tasks like generating questions, scoring subjective answers, and providing profile analysis, ensuring the main application remains fast and responsive.

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or later)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/your-username/nexhire-ai.git
   cd nexhire-ai
   ```

2. **Install NPM packages:**
   ```sh
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the root directory and add your Firebase and Google AI API keys.
   ```
   # Firebase Config (replace with your own)
   NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...

   # Genkit - Google AI
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the development server:**
   ```sh
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📁 Project Structure

The project follows a standard Next.js App Router structure:

```
/
├── src/
│   ├── app/                # Main application pages and layouts
│   │   ├── dashboard/      # Dashboard-specific pages
│   │   └── api/            # API routes (not used, Genkit flows are preferred)
│   ├── components/         # Reusable UI components (ShadCN, custom)
│   ├── hooks/              # Custom React hooks (e.g., useAuth, useAssessmentStore)
│   ├── lib/                # Utility functions, type definitions, and constants
│   ├── firebase/           # Firebase configuration and initialization
│   └── ai/                 # Genkit configuration and AI flows
│       └── flows/          # Individual Genkit flows for each AI feature
├── public/                 # Static assets
└── tailwind.config.ts      # Tailwind CSS configuration
```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

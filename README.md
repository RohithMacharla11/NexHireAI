
<div align="center">

  <h1 align="center">NexHireAI</h1>

  <p align="center">
    Beyond the resume. Beyond the static test.
    <br />
    <strong>AI-Powered Skill Assessments for the Future of Work.</strong>
    <br />
    <br />
    <a href="https://nex-hire-ai.vercel.app/">View Demo</a>
    ·
    <a href="https://github.com/RohithMacharla11/NexHireAI/issues">Report Bug</a>
    ·
    <a href="https://github.com/RohithMacharla11/NexHireAI/issues">Request Feature</a>
  </p>
</div>

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Genkit](https://img.shields.io/badge/Genkit-6A0dad?style=for-the-badge&logo=google-cloud&logoColor=white)

</div>

---

## 🚀 About NexHireAI

**NexHireAI** is a revolutionary platform that leverages cutting-edge generative AI to create dynamic, adaptive skill assessments. We move beyond static questionnaires to simulate real-world challenges, providing deep, actionable insights into a candidate's true potential and job readiness. Our mission is to empower both individuals seeking to prove their skills and businesses looking to build elite teams.

<br/>

---

## ✨ Key Features

NexHireAI is packed with features designed to create a comprehensive ecosystem for skill validation and career development.

| Feature                    | For Candidates 🧑‍💻                                                                                              | For Recruiters 🧑‍💼                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Dynamic Assessments**    | Take adaptive tests for 30+ roles with MCQs, short-answer, and live coding challenges in a Monaco editor.         | Deploy validated, role-specific assessments to evaluate candidate abilities in a real-world context.             |
| **AI-Powered Analytics**   | Get an interactive dashboard visualizing performance, highlighting skill gaps, and tracking growth over time. | Access detailed reports on candidate performance, compare talent, and make data-driven hiring decisions.       |
| **AI Career Suite**        | Utilize AI Job Recommender, Skill Master, and Learning Hub to chart a personalized career path.                 | Identify high-potential candidates whose skill profiles perfectly align with your open roles.                    |
| **Gamification**           | Earn Experience Points (XP) and unlock badges for achievements, making skill development engaging and fun.      | See candidate engagement and motivation through their progress and achievements on the platform.               |

---

## 🏗️ Architecture Overview

NexHireAI is built on a modern, scalable, and server-aware architecture designed for performance and maintainability.

```
+--------------------------------+      +------------------------------+
|          User's Browser        |      |      Recruiter's Browser     |
| (Candidate/Public User)        |      | (Admin/Recruiter User)       |
+--------------------------------+      +------------------------------+
               |                                       |
               v                                       v
+----------------------------------------------------------------------+
|                           Next.js Frontend                           |
|       (React, ShadCN UI, Tailwind CSS, Zustand State Management)     |
+----------------------------------------------------------------------+
     | (Auth, Profile, Assessments)        ^       | (AI-driven tasks)
     |                                     |       |
     v                                     |       v
+---------------------------------+      |       +---------------------------------+
|       Firebase Services         |      |       |         Genkit AI Flows         |
|---------------------------------|      +-------+       (Server-Side TypeScript)      |
| 🔥 Authentication (User Roles)  |      (Results) |---------------------------------|
| 💾 Firestore (Profiles, Data)   |              | - Generate/Score Assessments    |
+---------------------------------+              | - Analyze Profiles & Resumes    |
                                                 | - Recommend Jobs & Learning     |
                                                 +---------------------------------+
                                                           |
                                                           v
                                                 +------------------+
                                                 | Google AI Models |
                                                 | (Gemini API)     |
                                                 +------------------+
```
- **Next.js Frontend:** A modern, server-aware React application that handles all user-facing interfaces, client-side state, and routing.
- **Firebase Services:** Provides the core backend infrastructure. **Firebase Authentication** manages user identity with distinct roles (candidate, recruiter, admin), while **Firestore** serves as the scalable NoSQL database for all application data.
- **Genkit AI Flows:** Server-side TypeScript functions that orchestrate all interactions with Google's Gemini models. They handle complex tasks like generating questions, scoring subjective answers, and providing profile analysis, ensuring the main application remains fast and responsive.

---

## 🛠️ Technology Stack

- **Frontend:** [Next.js](https://nextjs.org/) 14, [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [ShadCN UI](https://ui.shadcn.com/)
- **Code Editor:** [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Backend & Database:** [Firebase](https://firebase.google.com/) (Authentication, Firestore)
- **AI & Generative Features:** [Google Genkit](https://firebase.google.com/docs/genkit) with the [Gemini API](https://ai.google.dev/)

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18 or later)
- An NPM-compatible package manager (e.g., npm, yarn, pnpm)

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/nexhire-ai.git
    cd nexhire-ai
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root directory and add your Firebase and Google AI credentials.
    ```env
    # Firebase Config (replace with your project's configuration)
    NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
    NEXT_PUBLIC_FIREBASE_APP_ID=...

    # Genkit - Google AI
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

4.  **Run the development server:**
    ```sh
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) (or the port specified in your `dev` script) to see the result.

---

## 👥 Meet the Team

This project is the result of the hard work and collaboration of a dedicated team:

*   **Macharla Rohith**
*   **Sanga Akhilananda Teja**
*   **Kunduru Sai Sruthi Reddy**
*   **Satukuri Kailash**

---

## 📜 License

Distributed under the MIT License. See `LICENSE.md` for more information.

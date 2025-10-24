
export type RoleType = 'candidate' | 'recruiter' | 'admin';

export interface Role {
  id: string;
  name: string;
  description: string;
  subSkills: string[];
}

export interface Question {
    id: string;
    questionText: string;
    type: 'mcq' | 'short' | 'coding';
    options?: string[];
    correctAnswer?: string;
    testCases?: { input: string; expectedOutput: string; }[];
    difficulty: 'Easy' | 'Medium' | 'Hard';
    timeLimit: number; // in seconds
    tags: string[];
    skill: string; // The sub-skill it belongs to
    starterCode?: string;
}

export interface UserResponse {
    questionId: string;
    skill: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    answer?: string; // For MCQ/short
    code?: string; // For coding
    timeTaken: number;
    isCorrect?: boolean; // Post-evaluation
    testCasesPassed?: number; // Post-evaluation
    totalTestCases?: number; // Post-evaluation
}

export interface Assessment {
    id: string;
    roleId: string;
    questions: Question[];
    totalTimeLimit: number;
}

export interface AssessmentAttempt {
    id: string;
    userId: string;
    assessmentId: string; // Links to the generated Assessment
    roleId: string;
    startedAt: number; // timestamp
    submittedAt?: number; // timestamp
    responses: UserResponse[];
    finalScore?: number;
    skillScores?: Record<string, number>; // e.g. { 'React': 85, 'CSS': 90 }
    aiFeedback?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  avatarUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  xp?: number;
  badges?: string[];
  candidateSpecific?: CandidateSpecificProfile;
  recruiterSpecific?: RecruiterSpecificProfile;
  analysis?: {
    summary?: AnalysisSummary;
  };
}

export interface CandidateSpecificProfile {
    collegeOrUniversity?: string;
    currentCompanyOrInternship?: string;
    experienceLevel?: 'Fresher' | 'Intermediate' | 'Experienced';
    yearsOfExperience?: number;
    skills?: string[];
    bio?: string;
    locationPreferences?: string[];
    experiences?: WorkExperience[];
    projects?: Project[];
    achievements?: Achievement[];
}

export interface RecruiterSpecificProfile {
    companyName?: string;
    designation?: string;
    mobileNumber?: string;
    companyWebsite?: string;
    yearsOfExperience?: number;
    hiringFocus?: string[];
    notes?: string;
}

export interface WorkExperience {
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    description: string;
}

export interface Project {
    title: string;
    description: string;
    url?: string;
}

export interface Achievement {
    title: string;
    description?: string;
}

export interface AnalysisSummary {
  topRoles: { role: string; score: number }[];
  readinessScore: number;
  gapAnalysis: string[];
  suggestedLearning: { task: string; estWeeks: number }[];
  resumeHealth: {
    contact: boolean;
    projects: boolean;
    skills: boolean;
    keywords: boolean;
  };
}

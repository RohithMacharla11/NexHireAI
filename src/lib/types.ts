
export type Role = 'candidate' | 'recruiter';

export type ExperienceLevel = 'Fresher' | 'Intermediate' | 'Experienced';

export interface Experience {
  title: string;
  company: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface Project {
  title: string;
  description?: string;
  url?: string;
}

export interface Achievement {
  title: string;
  description?: string;
}


export interface CandidateProfile {
  collegeOrUniversity?: string;
  currentCompanyOrInternship?: string;
  experienceLevel?: ExperienceLevel;
  yearsOfExperience?: number;
  skills?: string[];
  bio?: string;
  locationPreferences?: string[];
  experiences?: Experience[];
  projects?: Project[];
  achievements?: Achievement[];
}

export interface RecruiterProfile {
  mobileNumber?: string;
  companyName?: string;
  designation?: string;
  companyWebsite?: string;
  yearsOfExperience?: number;
  hiringFocus?: string[];
  locationPreferences?: string[];
  notes?: string;
}

export interface AnalysisSummary {
  topRoles?: { role: string; score: number }[];
  readinessScore?: number;
  gapAnalysis?: string[];
  suggestedLearning?: { task: string; estWeeks: number }[];
  resumeHealth?: {
    contact: boolean;
    projects: boolean;
    skills: boolean;
    keywords: boolean;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  analysis?: {
    summary: AnalysisSummary;
  };
  candidateSpecific?: CandidateProfile;
  recruiterSpecific?: RecruiterProfile;
}

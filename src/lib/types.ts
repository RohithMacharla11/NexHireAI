
export type Role = 'candidate' | 'recruiter';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  // Candidate specific
  college?: string;
  company?: string;
  skills?: string[];
  experienceLevel?: 'Fresher' | 'Intermediate' | 'Experienced';
  bio?: string;
  linkedin?: string;
  github?: string;
  // Recruiter specific
  mobile?: string;
  companyName?: string;
  designation?: string;
  companyWebsite?: string;
  yearsOfExperience?: number;
  hiringFocus?: string;
}

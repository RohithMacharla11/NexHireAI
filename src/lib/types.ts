
export type Role = 'candidate' | 'recruiter';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
}

    
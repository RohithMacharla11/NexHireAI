
import { User, Role } from './types';

// --- MOCK DATABASE ---
const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Rohith Macharla',
    email: 'macharlarohith111@gmail.com',
    role: 'candidate',
    avatarUrl: 'https://picsum.photos/seed/101/200'
  },
  {
    id: 'user-2',
    name: 'Admin User',
    email: 'macharlarohith45@gmail.com',
    role: 'recruiter',
    avatarUrl: 'https://picsum.photos/seed/102/200'
  },
];

const MOCK_PASSWORDS = new Map<string, string>([
  ['macharlarohith111@gmail.com', 'Rohith@999r'],
  ['macharlarohith45@gmail.com', 'Rohith@999r'],
]);

const SESSION_STORAGE_KEY = 'nexhireai_session';

// --- MOCK AUTH FUNCTIONS ---

export interface SignupData {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export const mockLogin = (email: string, password: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = MOCK_USERS.find((u) => u.email === email);
      const storedPassword = MOCK_PASSWORDS.get(email);

      if (user && storedPassword === password) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
        }
        resolve(user);
      } else {
        reject(new Error('Invalid email or password.'));
      }
    }, 1000);
  });
};

export const mockSignup = (signupData: SignupData): Promise<User> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const { name, email, password, role } = signupData;
            if (MOCK_USERS.some(u => u.email === email)) {
                return reject(new Error('An account with this email already exists.'));
            }

            const newUser: User = {
                id: `user-${MOCK_USERS.length + 1}`,
                name,
                email,
                role,
                avatarUrl: `https://picsum.photos/seed/${Math.random()}/200`
            };

            MOCK_USERS.push(newUser);
            MOCK_PASSWORDS.set(email, password);

            console.log("New user created:", newUser);
            console.log("Current users:", MOCK_USERS);
            
            resolve(newUser);
        }, 1000);
    });
};

export const mockLogout = (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
      resolve();
    }, 500);
  });
};

export const mockGetUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined') {
      const sessionData = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionData) {
        resolve(JSON.parse(sessionData));
      } else {
        resolve(null);
      }
    } else {
        resolve(null);
    }
  });
};

    
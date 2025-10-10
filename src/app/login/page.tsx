
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Chrome, Briefcase, User, ArrowLeft, Mail, KeyRound, UserCircle } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Role } from '@/lib/types';

export default function AuthPage() {
  const [isLoginMode, setIsLoginMode] = useState(true);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-secondary">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 15,
            ease: 'linear',
            repeat: Infinity,
          }}
          className="h-full w-full bg-[length:200%_200%] bg-gradient-to-br from-primary/30 via-accent/30 to-secondary"
        />
        <div className="absolute inset-0 bg-[url(/grid.svg)] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      </div>
      
      <Link href="/" className="absolute top-8 left-8 z-20 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <div className="flex min-h-screen w-full flex-col items-center justify-center lg:grid lg:grid-cols-2 lg:gap-8 px-4" style={{ perspective: '1200px' }}>
        
        {/* Left Panel: Motivational Content */}
        <div className="relative hidden lg:flex flex-col justify-center items-start p-12">
           <Link href="/" className="flex items-center gap-2 self-start mb-12">
            <Logo className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">NexHireAI</span>
          </Link>
          <div className='max-w-md'>
            <AnimatePresence mode="wait">
                <motion.div
                    key={isLoginMode ? 'login-text' : 'signup-text'}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <h2 className="text-5xl font-bold leading-tight text-foreground">
                        {isLoginMode ? "Your Career Journey Starts Here." : "Recruit the best. Get hired faster."}
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        {isLoginMode 
                            ? "Log in to continue finding the best talent or the perfect role."
                            : "Whether you’re a Candidate or a Recruiter, we’ve got you covered."
                        }
                    </p>
                </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right Panel: Auth Card */}
        <div className="flex items-center justify-center py-12">
          <motion.div
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            style={{ transformStyle: 'preserve-3d', rotateY: isLoginMode ? 0 : 180 }}
            className="relative w-[440px] h-[600px]"
          >
            {/* Login Form Face */}
            <motion.div
              className="absolute inset-0 w-full h-full"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <AuthCard>
                <LoginForm setIsLoginMode={setIsLoginMode} />
              </AuthCard>
            </motion.div>

            {/* Signup Form Face */}
            <motion.div
              className="absolute inset-0 w-full h-full"
              style={{ backfaceVisibility: 'hidden', rotateY: 180 }}
            >
              <AuthCard>
                <SignupForm setIsLoginMode={setIsLoginMode} />
              </AuthCard>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const AuthCard = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full h-full rounded-3xl border border-white/20 dark:border-white/20 bg-card/80 dark:bg-black/30 p-8 shadow-2xl backdrop-blur-lg">
    {children}
  </div>
);

function LoginForm({ setIsLoginMode }: { setIsLoginMode: (isLogin: boolean) => void }) {
    const { login } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        const formData = new FormData(event.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        try {
            await login(email, password);
            toast({ title: "Login Successful", description: "Welcome back!" });
            router.push('/');
        } catch (error) {
            toast({
                title: "Login Failed",
                description: (error as Error).message,
                variant: "destructive"
            });
            setIsLoading(false);
        }
    };
    
    return (
      <AnimatePresence>
        <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col h-full"
        >
            <div className="grid gap-2 text-center mb-10">
              <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
              <p className="text-balance text-muted-foreground">
                Enter your credentials to access your account.
              </p>
            </div>
            
            <div className="grid gap-6">
              <AuthInput id="email" name="email" type="email" placeholder="m@example.com" icon={<Mail className="h-4 w-4" />} required />
              <AuthInput id="password" name="password" type="password" placeholder="Password" icon={<KeyRound className="h-4 w-4" />} required />
            </div>

            <div className="mt-4 text-right">
                <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors underline">
                    Forgot password?
                </Link>
            </div>

            <div className="mt-8 space-y-4">
                <AuthButton type="submit" disabled={isLoading}>{isLoading ? 'Logging in...' : 'Login'}</AuthButton>
                <AuthButton variant="outline" type="button" disabled={isLoading}>
                    <Chrome className="mr-2 h-4 w-4" />
                    Login with Google
                </AuthButton>
            </div>
            
            <div className="mt-auto text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => setIsLoginMode(false)} className="underline font-semibold text-primary hover:text-primary/80 transition-colors">
                    Sign up
                </button>
            </div>
        </motion.form>
      </AnimatePresence>
    );
}
  
function SignupForm({ setIsLoginMode }: { setIsLoginMode: (isLogin: boolean) => void }) {
    const { signup } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        const formData = new FormData(event.currentTarget);
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const role = formData.get('role') as Role;

        try {
            await signup({ name, email, password, role });
            toast({ title: "Signup Successful", description: "Welcome! You can now log in." });
            setIsLoginMode(true);
        } catch (error) {
            toast({
                title: "Signup Failed",
                description: (error as Error).message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <AnimatePresence>
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col h-full"
          >
            <div className="grid gap-2 text-center mb-6">
              <h1 className="text-3xl font-bold text-foreground">Create an account</h1>
              <p className="text-balance text-muted-foreground">
                Enter your info to join the future of hiring.
              </p>
            </div>
            <div className="grid gap-4">
                <AuthInput id="name" name="name" placeholder="John Doe" icon={<UserCircle className="h-4 w-4" />} required />
                <AuthInput id="email" name="email" type="email" placeholder="m@example.com" icon={<Mail className="h-4 w-4" />} required />
                <AuthInput id="password" name="password" type="password" placeholder="Password" icon={<KeyRound className="h-4 w-4" />} required />
                
                <div className="grid gap-2 pt-2">
                  <Label className="text-muted-foreground text-sm">What best describes you?</Label>
                  <RadioGroup defaultValue="candidate" name="role" className="grid grid-cols-2 gap-4">
                    <RoleOption value="candidate" icon={<User className="h-6 w-6" />} label="Candidate" />
                    <RoleOption value="recruiter" icon={<Briefcase className="h-6 w-6" />} label="Recruiter" />
                  </RadioGroup>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                <AuthButton type="submit" disabled={isLoading}>{isLoading ? 'Creating account...' : 'Create an account'}</AuthButton>
                <AuthButton variant="outline" type="button" disabled={isLoading}>
                    <Chrome className="mr-2 h-4 w-4" />
                    Sign up with Google
                </AuthButton>
            </div>
            
            <div className="mt-auto text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <button type="button" onClick={() => setIsLoginMode(true)} className="underline font-semibold text-primary hover:text-primary/80 transition-colors">
                Login
              </button>
            </div>
          </motion.form>
        </AnimatePresence>
    );
}

const AuthInput = ({ id, name, type = 'text', placeholder, icon, required = false }: { id: string; name: string; type?: string; placeholder: string; icon: React.ReactNode; required?: boolean; }) => (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
        {icon}
      </div>
      <Input id={id} name={name} type={type} placeholder={placeholder} required={required} className="pl-10 h-12 bg-background/50 dark:bg-black/20 border-border dark:border-white/20 focus:bg-background/80 dark:focus:bg-black/30 transition-shadow duration-300 focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]" />
    </div>
);

const AuthButton = ({ children, variant = 'default', type, disabled }: { children: React.ReactNode, variant?: "default" | "outline", type?: "submit" | "button", disabled?: boolean }) => (
    <motion.div whileHover={{ scale: disabled ? 1 : 1.02 }} whileTap={{ scale: disabled ? 1 : 0.98 }}>
        <Button 
            type={type}
            disabled={disabled}
            className="w-full h-12 text-base transition-shadow duration-300 hover:shadow-primary/50 hover:shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)]"
            variant={variant}
        >
            {children}
        </Button>
    </motion.div>
);

const RoleOption = ({ value, icon, label }: { value: string; icon: React.ReactNode; label: string }) => (
    <motion.div whileTap={{ scale: 0.95 }} className="[transform-style:preserve-3d]">
      <RadioGroupItem value={value} id={value} className="peer sr-only" />
      <Label
        htmlFor={value}
        className="flex h-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-border bg-background/50 dark:border-white/20 dark:bg-black/30 p-4 shadow-lg transition-all hover:bg-background/80 dark:hover:bg-black/40 hover:shadow-primary/30 peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-primary/50 peer-data-[state=checked]:shadow-xl [transform:translateZ(0)]"
      >
        <div className="mb-2 text-primary [transform:translateZ(20px)]">{icon}</div>
        <span className="font-semibold text-foreground [transform:translateZ(10px)]">{label}</span>
      </Label>
    </motion.div>
);

    
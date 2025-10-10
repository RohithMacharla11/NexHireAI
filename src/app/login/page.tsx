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

export default function AuthPage() {
  const [isLoginMode, setIsLoginMode] = useState(true);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
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
          className="h-full w-full bg-[length:200%_200%] bg-gradient-to-br from-primary/30 via-accent/30 to-background"
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
                    <h2 className="text-5xl font-bold leading-tight text-white">
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
  <div className="w-full h-full rounded-3xl border border-white/20 bg-black/30 p-8 shadow-2xl backdrop-blur-lg">
    {children}
  </div>
);

function LoginForm({ setIsLoginMode }: { setIsLoginMode: (isLogin: boolean) => void }) {
    return (
      <AnimatePresence>
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col h-full"
        >
            <div className="grid gap-2 text-center mb-10">
              <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
              <p className="text-balance text-muted-foreground">
                Enter your credentials to access your account.
              </p>
            </div>
            
            <div className="grid gap-6">
              <AuthInput id="email" type="email" placeholder="m@example.com" icon={<Mail />} />
              <AuthInput id="password" type="password" placeholder="Password" icon={<KeyRound />} />
            </div>

            <div className="mt-4 text-right">
                <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors underline">
                    Forgot password?
                </Link>
            </div>

            <div className="mt-8 space-y-4">
                <AuthButton>Login</AuthButton>
                <AuthButton variant="outline">
                    <Chrome className="mr-2 h-4 w-4" />
                    Login with Google
                </AuthButton>
            </div>
            
            <div className="mt-auto text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <button onClick={() => setIsLoginMode(false)} className="underline font-semibold text-primary hover:text-primary/80 transition-colors">
                    Sign up
                </button>
            </div>
        </motion.div>
      </AnimatePresence>
    );
}
  
function SignupForm({ setIsLoginMode }: { setIsLoginMode: (isLogin: boolean) => void }) {
    return (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col h-full"
          >
            <div className="grid gap-2 text-center mb-6">
              <h1 className="text-3xl font-bold text-white">Create an account</h1>
              <p className="text-balance text-muted-foreground">
                Enter your info to join the future of hiring.
              </p>
            </div>
            <div className="grid gap-4">
                <AuthInput id="name" placeholder="John Doe" icon={<UserCircle />} />
                <AuthInput id="email" type="email" placeholder="m@example.com" icon={<Mail />} />
                <AuthInput id="password" type="password" placeholder="Password" icon={<KeyRound />} />
                
                <div className="grid gap-2 pt-2">
                  <Label className="text-muted-foreground text-sm">What best describes you?</Label>
                  <RadioGroup defaultValue="candidate" className="grid grid-cols-2 gap-4">
                    <RoleOption value="candidate" icon={<User />} label="Candidate" />
                    <RoleOption value="recruiter" icon={<Briefcase />} label="Recruiter" />
                  </RadioGroup>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                <AuthButton>Create an account</AuthButton>
                <AuthButton variant="outline">
                    <Chrome className="mr-2 h-4 w-4" />
                    Sign up with Google
                </AuthButton>
            </div>
            
            <div className="mt-auto text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <button onClick={() => setIsLoginMode(true)} className="underline font-semibold text-primary hover:text-primary/80 transition-colors">
                Login
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
    );
}

const AuthInput = ({ id, type = 'text', placeholder, icon }: { id: string; type?: string; placeholder: string; icon: React.ReactNode }) => (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
        {icon}
      </div>
      <Input id={id} type={type} placeholder={placeholder} required className="pl-10 h-12 bg-black/20 border-white/20 focus:bg-black/30 focus-visible:ring-offset-0 focus-visible:ring-accent" />
    </div>
);

const AuthButton = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: "default" | "outline" }) => (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button 
            type="submit" 
            className="w-full h-12 text-base transition-shadow duration-300 hover:shadow-accent/50 hover:shadow-[0_0_15px_rgba(var(--accent-rgb),0.4)]"
            variant={variant}
        >
            {children}
        </Button>
    </motion.div>
);

const RoleOption = ({ value, icon, label }: { value: string; icon: React.ReactNode; label: string }) => (
    <motion.div whileTap={{ scale: 0.95 }}>
      <RadioGroupItem value={value} id={value} className="peer sr-only" />
      <Label
        htmlFor={value}
        className="flex h-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-white/20 bg-black/30 p-4 shadow-lg transition-all hover:bg-black/40 peer-data-[state=checked]:border-accent peer-data-[state=checked]:shadow-accent/30 peer-data-[state=checked]:shadow-xl"
      >
        <div className="mb-2 text-accent">{icon}</div>
        <span className="font-semibold text-white">{label}</span>
      </Label>
    </motion.div>
);

    
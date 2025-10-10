
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Chrome, Briefcase, User, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/logo';

const panelVariants = {
  hidden: { x: '-100%', opacity: 0 },
  visible: { x: '0%', opacity: 1 },
  exit: { x: '100%', opacity: 0 },
};

const formVariants = {
    hidden: (isLogin: boolean) => ({
      x: isLogin ? '-100%' : '100%',
      opacity: 0,
    }),
    visible: {
      x: '0%',
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 30,
      },
    },
    exit: (isLogin: boolean) => ({
      x: isLogin ? '100%' : '-100%',
      opacity: 0,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 30,
      },
    }),
  };

const rightPanelVariants = {
    initial: (isLogin: boolean) => ({
        x: isLogin ? '100%' : '-100%',
        opacity: 0,
    }),
    animate: {
        x: 0,
        opacity: 1,
        transition: { type: 'spring', stiffness: 260, damping: 30, delay: 0.1 },
    },
    exit: (isLogin: boolean) => ({
        x: isLogin ? '-100%' : '100%',
        opacity: 0,
        transition: { type: 'spring', stiffness: 260, damping: 30 },
    }),
};

export default function AuthPage() {
  const [isLoginMode, setIsLoginMode] = useState(true);

  return (
    <div className="relative min-h-screen w-full lg:grid lg:grid-cols-2 overflow-hidden bg-background">
       <Link href="/" className="absolute top-4 left-4 z-20 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>
      
      {/* Left Panel: Form */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 z-10">
        <div className="w-full max-w-md space-y-8">
            <AnimatePresence mode="wait" custom={isLoginMode}>
                {isLoginMode ? (
                     <LoginForm key="login" setIsLoginMode={setIsLoginMode} />
                ) : (
                    <SignupForm key="signup" setIsLoginMode={setIsLoginMode} />
                )}
            </AnimatePresence>
        </div>
      </div>
      
      {/* Right Panel: Motivational content */}
      <div className="relative hidden lg:block">
        <AnimatePresence mode="wait" custom={!isLoginMode}>
        <motion.div
            key={isLoginMode ? 'login-bg' : 'signup-bg'}
            className="absolute inset-0"
            variants={rightPanelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            custom={isLoginMode}
        >
          <div className={`absolute inset-0 transition-all duration-700 ${isLoginMode ? 'bg-gradient-to-br from-primary via-primary/80 to-background' : 'bg-gradient-to-br from-accent via-accent/80 to-background'}`} />
          <div className="absolute inset-0 bg-[url(/grid.svg)] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        </motion.div>
        </AnimatePresence>

        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link href="/" className="flex items-center gap-2 self-start">
            <Logo className="h-8 w-8 text-primary-foreground" />
            <span className="text-xl font-bold">NexHireAI</span>
          </Link>
          <div className='max-w-md'>
            <AnimatePresence mode="wait">
                <motion.div
                    key={isLoginMode ? 'login-text' : 'signup-text'}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-4xl font-bold">
                        {isLoginMode ? "Your Career Journey Starts Here." : "Find the Perfect Match, Faster."}
                    </h2>
                    <p className="mt-4 text-lg text-primary-foreground/80">
                        {isLoginMode 
                            ? "Log in to continue finding the best talent or the perfect role."
                            : "Whether you’re a Candidate or a Recruiter, we’ve got you covered."
                        }
                    </p>
                </motion.div>
            </AnimatePresence>
          </div>
          <div/>
        </div>
      </div>
    </div>
  );
}


function LoginForm({ setIsLoginMode }: { setIsLoginMode: (isLogin: boolean) => void }) {
    return (
      <motion.div
        key="login"
        variants={formVariants}
        custom={true}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full"
      >
        <div className="grid gap-2 text-center mb-8">
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-balance text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" required />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Password</Label>
              <Link href="#" className="ml-auto inline-block text-sm underline">
                Forgot your password?
              </Link>
            </div>
            <Input id="password" type="password" required />
          </div>
          <Button type="submit" className="w-full">
            Login
          </Button>
          <Button variant="outline" className="w-full">
            <Chrome className="mr-2 h-4 w-4" />
            Login with Google
          </Button>
        </div>
        <div className="mt-6 text-center text-sm">
          Don&apos;t have an account?{' '}
          <button onClick={() => setIsLoginMode(false)} className="underline font-semibold">
            Sign up
          </button>
        </div>
      </motion.div>
    );
  }
  

function SignupForm({ setIsLoginMode }: { setIsLoginMode: (isLogin: boolean) => void }) {
    return (
        <motion.div
            key="signup"
            variants={formVariants}
            custom={false}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full"
        >
        <div className="grid gap-2 text-center mb-6">
          <h1 className="text-3xl font-bold">Create an account</h1>
          <p className="text-balance text-muted-foreground">
            Enter your information to get started
          </p>
        </div>
        <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="John Doe" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required />
            </div>
            <div className="grid gap-2">
              <Label>What best describes you?</Label>
              <RadioGroup defaultValue="candidate" className="grid grid-cols-2 gap-4 pt-1">
                <motion.div whileTap={{ scale: 0.95 }}>
                  <RadioGroupItem value="candidate" id="candidate" className="peer sr-only" />
                  <Label
                    htmlFor="candidate"
                    className="flex h-full cursor-pointer flex-col items-center justify-between rounded-lg border-2 border-border bg-popover p-4 shadow-md transition-all hover:bg-accent/50 hover:shadow-lg peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-primary/20 peer-data-[state=checked]:shadow-md"
                  >
                    <User className="mb-3 h-6 w-6 text-primary" />
                    Candidate
                  </Label>
                </motion.div>
                <motion.div whileTap={{ scale: 0.95 }}>
                  <RadioGroupItem value="recruiter" id="recruiter" className="peer sr-only" />
                  <Label
                    htmlFor="recruiter"
                    className="flex h-full cursor-pointer flex-col items-center justify-between rounded-lg border-2 border-border bg-popover p-4 shadow-md transition-all hover:bg-accent/50 hover:shadow-lg peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-primary/20 peer-data-[state=checked]:shadow-md"
                  >
                    <Briefcase className="mb-3 h-6 w-6 text-primary" />
                    Recruiter
                  </Label>
                </motion.div>
              </RadioGroup>
            </div>
          <Button type="submit" className="w-full">
            Create an account
          </Button>
          <Button variant="outline" className="w-full">
            <Chrome className="mr-2 h-4 w-4" />
            Sign up with Google
          </Button>
        </div>
        <div className="mt-6 text-center text-sm">
          Already have an account?{' '}
          <button onClick={() => setIsLoginMode(true)} className="underline font-semibold">
            Login
          </button>
        </div>
      </motion.div>
    );
}

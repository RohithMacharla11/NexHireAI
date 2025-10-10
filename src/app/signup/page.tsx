'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Chrome, Briefcase, User } from 'lucide-react';
import { Logo } from '@/components/logo';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function SignupPage() {
  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
       <div className="relative hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-accent via-accent/80 to-background" />
        <div className="absolute inset-0 bg-[url(/grid.svg)] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="flex h-full flex-col justify-between p-12 text-accent-foreground">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-accent-foreground" />
            <span className="text-xl font-bold">NexHireAI</span>
          </Link>
          <motion.div variants={itemVariants} className="max-w-md">
            <h2 className="text-4xl font-bold">Join The Network</h2>
            <p className="mt-4 text-lg text-accent-foreground/80">
              Whether you’re a Candidate looking for opportunities or a Recruiter searching for talent, we’ve got you covered.
            </p>
          </motion.div>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <motion.div
          className="mx-auto grid w-[380px] gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Create an account</h1>
            <p className="text-balance text-muted-foreground">
              Enter your information to create an account
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="grid gap-4">
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
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" required />
            </div>

            <div className="grid gap-2">
              <Label>What best describes you?</Label>
              <RadioGroup defaultValue="candidate" className="grid grid-cols-2 gap-4">
                <div>
                  <RadioGroupItem value="candidate" id="candidate" className="peer sr-only" />
                  <Label
                    htmlFor="candidate"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <User className="mb-3 h-6 w-6" />
                    Candidate
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="recruiter" id="recruiter" className="peer sr-only" />
                  <Label
                    htmlFor="recruiter"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <Briefcase className="mb-3 h-6 w-6" />
                    Recruiter
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <Button type="submit" className="w-full">
              Create an account
            </Button>
            <Button variant="outline" className="w-full">
              <Chrome className="mr-2 h-4 w-4" />
              Sign up with Google
            </Button>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Login
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

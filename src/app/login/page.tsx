'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Chrome } from 'lucide-react';
import { Logo } from '@/components/logo';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-background" />
        <div className="absolute inset-0 bg-[url(/grid.svg)] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="flex h-full flex-col justify-between p-12 text-primary-foreground">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8 text-primary-foreground" />
            <span className="text-xl font-bold">NexHireAI</span>
          </Link>
          <motion.div variants={itemVariants} className="max-w-md">
            <h2 className="text-4xl font-bold">Welcome Back</h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Log in to continue your journey finding the best talent or the perfect role.
            </p>
          </motion.div>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <motion.div
          className="mx-auto grid w-[350px] gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email below to login to your account
            </p>
          </motion.div>
          <motion.div variants={itemVariants} className="grid gap-4">
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
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="ml-auto inline-block text-sm underline"
                >
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
          </motion.div>
          <motion.div variants={itemVariants} className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

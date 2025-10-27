
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Hero } from "@/components/landing/hero";
import { About } from "@/components/landing/about";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Testimonials } from "@/components/landing/testimonials";
import { Cta } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'admin' || user.role === 'recruiter') {
        router.replace('/admin');
      }
    }
  }, [user, isLoading, router]);

  // While loading, or if the user is an admin who is about to be redirected,
  // show a full-screen loader to prevent flashing the candidate homepage.
  if (isLoading || (user && (user.role === 'admin' || user.role === 'recruiter')) ) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
          <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Only render the homepage if the user is not an admin/recruiter or is not logged in.
  return (
    <div className="bg-background">
      <Hero />
      <About />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Cta />
      <Footer />
    </div>
  );
}

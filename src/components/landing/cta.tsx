
'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function Cta() {
  return (
    <section id="contact" className="py-16 sm:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-primary/90 p-8 sm:p-12">
          <div className="absolute inset-0 bg-[url(/grid.svg)] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
          <div className="relative z-10 text-center">
            <h2 className="text-3xl font-bold tracking-tighter text-primary-foreground sm:text-4xl">
              Ready to Build Your Future?
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-primary-foreground/80 md:text-lg">
              Sign up now to access AI-powered assessments and unlock your true potential.
            </p>
            <motion.div 
              className="mt-8 inline-block"
              whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px hsl(var(--card))" }} 
              whileTap={{ scale: 0.95 }}
            >
              <Button asChild size="lg" variant="secondary" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-12 px-8 text-base">
                <Link href="/login">Get Started Free</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

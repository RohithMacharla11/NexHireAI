'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function Cta() {
    const ctaImage = PlaceHolderImages.find(p => p.id === 'feature4');
  return (
    <section id="contact" className="py-16 sm:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-primary/90 p-8 sm:p-12">
          {ctaImage && (
             <Image 
                src={ctaImage.imageUrl}
                alt="AI Assistance"
                data-ai-hint={ctaImage.imageHint}
                fill
                className="object-cover object-center opacity-20"
             />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary"></div>
          <div className="relative z-10 text-center">
            <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true, amount: 0.5 }}
                 transition={{ duration: 0.6 }}
            >
                <h2 className="text-3xl font-bold tracking-tighter text-primary-foreground sm:text-4xl md:text-5xl">
                Ready to Unlock Your Potential?
                </h2>
                <p className="mt-4 max-w-xl mx-auto text-primary-foreground/80 md:text-lg">
                Sign up today and start building a verified portfolio of your skills with AI-driven insights.
                </p>
                <motion.div 
                className="mt-8 inline-block"
                whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px hsl(var(--card))" }} 
                whileTap={{ scale: 0.95 }}
                >
                <Button asChild size="lg" variant="secondary" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-12 px-8 text-base">
                    <Link href="/login">Sign Up for Free</Link>
                </Button>
                </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

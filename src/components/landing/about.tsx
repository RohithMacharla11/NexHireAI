'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CheckCircle } from 'lucide-react';

export function About() {
  const aboutImage = PlaceHolderImages.find(p => p.id === 'about-visual');
  const stats = [
    { value: '90%+', label: 'Score Improvement on Retake' },
    { value: '30+', label: 'In-Demand Tech Roles' },
    { value: '10k+', label: 'Skills Assessed Monthly' },
  ];

  return (
    <section id="about" className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative aspect-video"
            >
                {aboutImage && (
                    <Image 
                        src={aboutImage.imageUrl}
                        alt="A developer focused on their code"
                        data-ai-hint={aboutImage.imageHint}
                        fill
                        className="rounded-2xl object-cover shadow-2xl"
                    />
                )}
            </motion.div>
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                Learn Smarter, Grow Faster
              </h2>
              <p className="mt-4 text-muted-foreground md:text-xl">
                Stop guessing what you need to learn. NexHireAI provides a powerful suite of AI-driven tools to identify your strengths, pinpoint weaknesses, and build a verified Skill Portfolio that gets you noticed.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-4">
                  {stats.map(stat => (
                      <div key={stat.label} className="bg-card/50 p-4 rounded-lg text-center">
                          <p className="text-3xl font-bold text-primary">{stat.value}</p>
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </div>
                  ))}
              </div>
            </motion.div>
        </div>
      </div>
    </section>
  );
}

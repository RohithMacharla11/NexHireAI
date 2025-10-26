'use client';

import { motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

function useParallax(value: MotionValue<number>, distance: number) {
  return useTransform(value, [0, 1], [-distance, distance]);
}

export function Hero() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [0, 500], [0, -15]);
  const rotateY = useTransform(x, [0, 500], [0, 15]);

  function handleMouse(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  }

  function handleMouseLeave() {
    x.set(250);
    y.set(250);
  }

  return (
    <section id="home" className="relative w-full min-h-[90vh] flex items-center justify-center text-center overflow-hidden">
        {/* Background Image and Gradient */}
        <div className="absolute inset-0 z-0">
            {heroImage && (
                <Image
                    src={heroImage.imageUrl}
                    alt="Abstract background"
                    fill
                    className="object-cover"
                    data-ai-hint={heroImage.imageHint}
                    priority
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.1),rgba(255,255,255,0))]"></div>
        </div>
      
      <div 
        className="container z-10 px-4 md:px-6 relative" 
        onMouseMove={handleMouse}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div 
            style={{
                perspective: '1000px',
            }}
            className="mx-auto max-w-4xl"
        >
            <motion.div
                 style={{
                    rotateX,
                    rotateY,
                    transformStyle: 'preserve-3d',
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="p-8 md:p-12 rounded-3xl border border-white/10 bg-card/60 shadow-2xl backdrop-blur-xl dark:border-white/20 dark:bg-black/20"
                >
                    <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                        Discover and Improve Your Skills with AI
                    </h1>
                    <p className="mt-6 text-lg text-muted-foreground md:text-xl">
                        NexHireAI moves beyond traditional learning to help you master real-world abilities with dynamic, AI-powered skill assessments.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <motion.div whileHover={{ scale: 1.05, boxShadow: "0px 0px 20px hsl(var(--primary))" }} whileTap={{ scale: 0.95 }}>
                          <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 text-base">
                            <Link href="/login">Start My Skill Journey</Link>
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button asChild size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base">
                            <Link href="/skill-assessment">Explore Assessments</Link>
                          </Button>
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section id="home" className="relative w-full h-[80vh] min-h-[600px] flex items-center justify-center text-center overflow-hidden">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.2),rgba(255,255,255,0))]"></div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="container z-10 px-4 md:px-6"
      >
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Empower your workflow with intelligent automation.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl">
            Discover the future of productivity. Our platform streamlines your tasks, providing AI-driven insights and seamless integration, so you can focus on what matters most.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.05, boxShadow: "0px 0px 12px hsl(var(--primary))" }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" className="w-full sm:w-auto">Get Started</Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto">Learn More</Button>
            </motion.div>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            10K+ users worldwide
          </p>
        </div>
      </motion.div>
    </section>
  );
}

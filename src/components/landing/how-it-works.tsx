'use client';

import { motion } from 'framer-motion';
import { UserPlus, Target, BarChartBig } from 'lucide-react';

const steps = [
  {
    icon: <UserPlus className="h-10 w-10 text-primary" />,
    title: "Sign Up",
    description: "Create your account in seconds and get immediate access."
  },
  {
    icon: <Target className="h-10 w-10 text-primary" />,
    title: "Set Your Goals",
    description: "Define your objectives and let our platform guide you."
  },
  {
    icon: <BarChartBig className="h-10 w-10 text-primary" />,
    title: "Watch Productivity Grow",
    description: "Track your progress and see tangible results in real-time."
  }
];

export function HowItWorks() {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5
      }
    },
  };

  return (
    <section id="about" className="py-16 sm:py-24 bg-background/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">How It Works</h2>
          <p className="mt-4 max-w-xl mx-auto text-muted-foreground md:text-lg">
            Getting started is as simple as one, two, three.
          </p>
        </div>
        <motion.div 
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {/* Dashed line for desktop */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-px -translate-y-1/2">
             <svg width="100%" height="2">
               <line x1="0" y1="1" x2="100%" y2="1" strokeWidth="2" strokeDasharray="10 10" className="stroke-border"/>
             </svg>
          </div>

          {steps.map((step, index) => (
            <motion.div key={index} variants={itemVariants} className="flex flex-col items-center text-center z-10">
              <div className="flex items-center justify-center bg-card p-4 rounded-full border shadow-lg mb-6">
                 {step.icon}
              </div>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

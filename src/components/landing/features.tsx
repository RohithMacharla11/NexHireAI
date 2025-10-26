'use client';

import { motion } from 'framer-motion';
import { BrainCircuit, Zap, BarChart, ShieldCheck, Briefcase, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const featuresData = [
  {
    icon: <Zap className="h-8 w-8 text-primary" />,
    title: 'Dynamic Assessments',
    description: 'Go beyond theory with hands-on tests for 30+ tech roles that adapt to your skill level.',
    imageId: 'feature1',
  },
  {
    icon: <BrainCircuit className="h-8 w-8 text-primary" />,
    title: 'AI-Powered Feedback',
    description: 'Get instant, personalized feedback on your code, problem-solving, and overall performance.',
    imageId: 'feature4',
  },
  {
    icon: <BarChart className="h-8 w-8 text-primary" />,
    title: 'Growth Analytics',
    description: 'Visualize your progress, identify skill gaps, and track your journey to mastery on your personal dashboard.',
    imageId: 'feature3',
  },
  {
    icon: <Star className="h-8 w-8 text-primary" />,
    title: 'Verified Skill Portfolio',
    description: 'Build a portfolio of verified skills, badges, and scores that you can share with potential employers.',
    imageId: 'feature2',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0 },
};

export function Features() {
  return (
    <section id="features" className="py-16 sm:py-24 bg-background/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">A Better Way to Grow Your Technical Skills</h2>
          <p className="mt-4 max-w-2xl mx-auto text-muted-foreground md:text-xl">
            Our platform provides the tools you need to prove your abilities and master the skills that matter most.
          </p>
        </div>
        <motion.div 
            className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            transition={{ staggerChildren: 0.2 }}
        >
          {featuresData.map((feature, index) => {
            const image = PlaceHolderImages.find(img => img.id === feature.imageId);
            return (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Card className="h-full bg-card/60 backdrop-blur-sm border-border/20 shadow-lg transition-all duration-300 hover:border-primary/60 hover:shadow-primary/10 hover:-translate-y-1 overflow-hidden group">
                {image && (
                    <div className="aspect-video overflow-hidden">
                        <Image
                            src={image.imageUrl}
                            alt={feature.title}
                            width={600}
                            height={400}
                            data-ai-hint={image.imageHint}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    </div>
                )}
                <CardHeader className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full border">
                        {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-muted-foreground p-6 pt-0">
                  {feature.description}
                </CardContent>
              </Card>
            </motion.div>
          )})}
        </motion.div>
      </div>
    </section>
  );
}

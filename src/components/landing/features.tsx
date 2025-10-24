
'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { BrainCircuit, Zap, BarChart, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useRef } from 'react';

const featuresData = [
  {
    icon: <Zap className="h-8 w-8 text-primary" />,
    title: 'Smart Automation',
    description: 'Automate repetitive tasks and workflows with our intelligent engine.',
    imageId: 'feature1',
  },
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: 'Secure Sync',
    description: 'Keep your data synced and secure across all your devices in real-time.',
    imageId: 'feature2',
  },
  {
    icon: <BarChart className="h-8 w-8 text-primary" />,
    title: 'Real-Time Insights',
    description: 'Gain actionable insights from your data with our advanced analytics dashboard.',
    imageId: 'feature3',
  },
  {
    icon: <BrainCircuit className="h-8 w-8 text-primary" />,
    title: 'AI Assistance',
    description: 'Leverage the power of AI to enhance your decision-making and productivity.',
    imageId: 'feature4',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0 },
};

export function Features() {
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);

  return (
    <section id="features" className="py-16 sm:py-24" ref={targetRef}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Everything You Need, and More</h2>
          <p className="mt-4 max-w-xl mx-auto text-muted-foreground md:text-lg">
            Our platform is packed with powerful features to help you succeed.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {featuresData.map((feature, index) => {
            const image = PlaceHolderImages.find(img => img.id === feature.imageId);
            return (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              style={{ y }}
            >
              <Card className="h-full bg-card/60 backdrop-blur-sm border-border/20 shadow-lg transition-all duration-300 hover:border-primary/60 hover:shadow-primary/10 hover:-translate-y-1 overflow-hidden">
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
                <CardHeader className="flex flex-col items-center text-center p-4">
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground p-4 pt-0">
                  {feature.description}
                </CardContent>
              </Card>
            </motion.div>
          )})}
        </div>
      </div>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const testimonials = [
  {
    quote: "This platform has revolutionized our workflow. The AI assistance is a game-changer!",
    name: "Alex Doe",
    title: "CEO, Innovate Inc.",
    avatar: "https://picsum.photos/seed/1/200/200"
  },
  {
    quote: "I've never been more organized. The real-time sync is flawless and incredibly reliable.",
    name: "Brenda Smith",
    title: "Project Manager, Solutions Co.",
    avatar: "https://picsum.photos/seed/2/200/200"
  },
  {
    quote: "The insights I get from the analytics dashboard are invaluable for my business decisions.",
    name: "Charles Brown",
    title: "Founder, DataDriven LLC",
    avatar: "https://picsum.photos/seed/3/200/200"
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5
    }
  },
};

export function Testimonials() {
  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Loved by Teams Everywhere</h2>
          <p className="mt-4 max-w-xl mx-auto text-muted-foreground md:text-lg">
            Don't just take our word for it. Here's what our users have to say.
          </p>
        </div>
        <motion.div 
          className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="h-full bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                <CardContent className="p-6">
                  <p className="text-foreground/80 mb-6">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                      <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

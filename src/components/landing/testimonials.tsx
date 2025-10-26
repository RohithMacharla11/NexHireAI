'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const testimonials = [
  {
    quote: "NexHireAI's feedback was a game-changer. I found my weak spots in React and landed a better job in a month.",
    name: "Alex Doe",
    title: "Frontend Developer",
    avatarId: "avatar1"
  },
  {
    quote: "The Skill Portfolio is brilliant. I attached it to my resume and recruiters were instantly impressed.",
    name: "Brenda Smith",
    title: "Data Science Student",
    avatarId: "avatar2"
  },
  {
    quote: "I finally have a clear path to becoming an AI Engineer. The personalized learning plan is invaluable.",
    name: "Charles Brown",
    title: "Aspiring AI Engineer",
    avatarId: "avatar3"
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
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Loved by Developers Everywhere</h2>
          <p className="mt-4 max-w-xl mx-auto text-muted-foreground md:text-lg">
            Don't just take our word for it. Here's how our users are leveling up their careers.
          </p>
        </div>
        <motion.div 
          className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {testimonials.map((testimonial, index) => {
            const image = PlaceHolderImages.find(img => img.id === testimonial.avatarId);
            return (
            <motion.div key={index} variants={itemVariants}>
              <Card className="h-full bg-card/60 backdrop-blur-sm border-border/20 shadow-lg">
                <CardContent className="p-6">
                  <p className="text-foreground/80 mb-6">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage src={image?.imageUrl} alt={testimonial.name} data-ai-hint={image?.imageHint} />
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
          )})}
        </motion.div>
      </div>
    </section>
  );
}

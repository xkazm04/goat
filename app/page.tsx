'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Layers, Zap, Code, Gift } from 'lucide-react';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Tech Startup <span className="text-primary">Boilerplate</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A scalable, clean architecture for your next big idea. Built with Next.js, TypeScript, and Tailwind CSS.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="flex justify-center space-x-4 mb-16"
      >
        <Button asChild size="lg" className="gap-2">
          <Link href="/match">
            Try Match Feature <ArrowRight size={16} />
          </Link>
        </Button>
        <ThemeToggle />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="p-2 w-12 h-12 rounded-lg bg-primary/10 mb-4 flex items-center justify-center">
                  {feature.icon}
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.content}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold mb-6">Ready to get started?</h2>
        <Button asChild size="lg">
          <Link href="/match">
            Explore the Match Feature
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}

const features = [
  {
    title: "Clean Architecture",
    description: "Separation of concerns",
    content: "Built with scalability in mind, following clean code principles and a modular structure.",
    icon: <Code className="h-6 w-6 text-primary" />
  },
  {
    title: "Modern Stack",
    description: "Next.js + TypeScript + Tailwind",
    content: "Leverage the power of the latest web technologies for a robust development experience.",
    icon: <Zap className="h-6 w-6 text-primary" />
  },
  {
    title: "Feature Rich",
    description: "Ready-to-use components",
    content: "Pre-built components and features to kickstart your project and focus on what matters.",
    icon: <Gift className="h-6 w-6 text-primary" />
  },
  {
    title: "Themeable",
    description: "Multiple theme options",
    content: "Switch between light, dark, and experimental themes to match your brand identity.",
    icon: <Layers className="h-6 w-6 text-primary" />
  }
];
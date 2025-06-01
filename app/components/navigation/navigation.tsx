"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/app/lib/utils';
import { motion } from 'framer-motion';
import { Settings, Home, GitCompare } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { useState } from 'react';

const mainNav = [
  { name: 'Home', href: '/', icon: <Home className="h-4 w-4 mr-2" /> },
  { name: 'Match', href: '/match', icon: <GitCompare className="h-4 w-4 mr-2" /> },
];

export default function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/\" className="mr-6 flex items-center space-x-2">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
              className="bg-primary p-1 rounded-md"
            >
              <span className="sr-only">Logo</span>
              <GitCompare className="h-6 w-6 text-primary-foreground" />
            </motion.div>
            <span className="font-bold">TechMatch</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center transition-colors hover:text-primary",
                  pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {item.icon}
                {item.name}
                {pathname === item.href && (
                  <motion.div
                    layoutId="navigation-underline"
                    className="absolute left-0 bottom-0 h-[2px] w-full bg-primary"
                    transition={{ type: "spring", bounce: 0.25 }}
                  />
                )}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex-1" />
        
        <div className="flex items-center space-x-2">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Settings className="h-4 w-4" />
                <span className="sr-only">Settings</span>
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Settings</SheetTitle>
                <SheetDescription>Customize your experience</SheetDescription>
              </SheetHeader>
              <div className="py-4">
                <div className="space-y-4 py-4">
                  <div className="px-3 py-2">
                    <h3 className="mb-2 text-sm font-medium">Navigation</h3>
                    <nav className="space-y-2">
                      {mainNav.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                            pathname === item.href
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          {item.icon}
                          {item.name}
                        </Link>
                      ))}
                    </nav>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
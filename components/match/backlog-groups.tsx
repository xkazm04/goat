"use client";

import { useMatchStore } from "@/stores/match-store";
import { BacklogGroup } from "./backlog-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { useMemo } from "react";

export function BacklogGroups() {
  const { backlogGroups } = useMatchStore();
  
  // Create a sorted version of backlog groups with open ones first
  const sortedGroups = useMemo(() => {
    return [...backlogGroups].sort((a, b) => {
      // Sort by isOpen (open first) and then by title
      if (a.isOpen !== b.isOpen) {
        return a.isOpen ? -1 : 1;
      }
      return a.title.localeCompare(b.title);
    });
  }, [backlogGroups]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <h2 className="text-xl font-bold mb-4">Backlog Items</h2>
      
      <ScrollArea className="h-[600px] pr-4">
        <motion.div 
          className="space-y-3"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {sortedGroups.map((group) => (
            <motion.div key={group.id} variants={item}>
              <BacklogGroup group={group} />
            </motion.div>
          ))}
        </motion.div>
      </ScrollArea>
    </div>
  );
}
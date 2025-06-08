"use client";

import { BacklogGroupType } from "@/types/match";
import { BacklogItem } from "./backlog-item";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMatchStore } from "@/stores/match-store";
import { motion, AnimatePresence } from "framer-motion";

interface BacklogGroupProps {
  group: BacklogGroupType;
}

export function BacklogGroup({ group }: BacklogGroupProps) {
  const { toggleBacklogGroup } = useMatchStore();
  
  // Count unmatched items in this group
  const unmatchedCount = group.items.filter(item => !item.matched).length;
  
  const handleToggle = () => {
    toggleBacklogGroup(group.id);
  };

  return (
    <Collapsible
      open={group.isOpen}
      onOpenChange={handleToggle}
      className={cn(
        "rounded-md border",
        group.isOpen ? "bg-muted/50" : "bg-card"
      )}
    >
      <div className="flex items-center p-3">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
            {group.isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle group</span>
          </Button>
        </CollapsibleTrigger>
        
        <div className="flex-1 ml-2">
          <div className="font-medium">{group.title}</div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            {unmatchedCount} / {group.items.length}
          </Badge>
        </div>
      </div>
      
      <AnimatePresence>
        {group.isOpen && (
          <CollapsibleContent forceMount asChild>
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-3 pt-0">
                <div className="pl-6 space-y-2">
                  {group.items.map((item) => (
                    <BacklogItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </motion.div>
          </CollapsibleContent>
        )}
      </AnimatePresence>
    </Collapsible>
  );
}
"use client";

import { BacklogItemType } from "@/types/match";
import { Badge } from "@/components/ui/badge";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { useMatchStore } from "@/stores/match-store";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface BacklogItemProps {
  item: BacklogItemType;
}

export function BacklogItem({ item }: BacklogItemProps) {
  const { 
    selectedBacklogItem, 
    setSelectedBacklogItem,
    selectedGridItem 
  } = useMatchStore();
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    disabled: item.matched,
  });
  
  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  const handleClick = () => {
    if (!item.matched) {
      if (selectedBacklogItem === item.id) {
        setSelectedBacklogItem(null);
      } else {
        setSelectedBacklogItem(item.id);
      }
    }
  };

  return (
    <motion.div
      whileHover={{ scale: item.matched ? 1 : 1.02 }}
      whileTap={{ scale: item.matched ? 1 : 0.98 }}
    >
      <div
        ref={setNodeRef}
        style={style}
        {...(item.matched ? {} : { ...attributes, ...listeners })}
        onClick={handleClick}
        className={cn(
          "p-2 rounded-md border text-sm flex items-start gap-2 transition-colors",
          isDragging ? "opacity-50" : "opacity-100",
          item.matched ? "bg-verified/10 border-verified cursor-default" : "bg-card cursor-pointer hover:bg-muted",
          selectedBacklogItem === item.id && "ring-2 ring-primary ring-offset-1 border-primary"
        )}
      >
        {item.matched ? (
          <CheckCircle2 className="h-4 w-4 text-verified shrink-0 mt-0.5" />
        ) : (
          <div className="w-4 h-4 bg-primary/20 rounded-full shrink-0 mt-0.5" />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{item.title}</div>
          
          {item.description && (
            <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {item.description}
            </div>
          )}
          
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {item.tags.map((tag, i) => (
                <Badge 
                  key={i} 
                  variant="secondary" 
                  className="text-xs px-1 h-5"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {item.matched && (
            <div className="text-xs text-verified mt-1">
              Matched with: {item.matchedWith}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
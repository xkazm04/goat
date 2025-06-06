"use client";

import { GridItemType } from "@/types/match";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GridItemProps {
  item: GridItemType;
  index: number;
  onClick: () => void;
  isSelected: boolean;
}

export function GridItem({ item, index, onClick, isSelected }: GridItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="touch-manipulation"
    >
      <Card
        onClick={onClick}
        className={cn(
          "cursor-pointer border-2 transition-all",
          isSelected ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent",
          isDragging ? "opacity-50" : "opacity-100",
          item.matched ? "border-verified bg-verified/5" : ""
        )}
      >
        <CardContent className="p-3 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <Badge variant="outline" className="font-mono">
              #{index + 1}
            </Badge>
            {item.matched && (
              <Badge className="bg-verified text-white">Matched</Badge>
            )}
          </div>
          
          <h3 className="font-medium line-clamp-2">{item.title}</h3>
          
          <div className="flex flex-wrap gap-1 mt-1">
            {item.tags && item.tags.map((tag, i) => (
              <Badge 
                key={i} 
                variant="secondary" 
                className="text-xs"
              >
                {tag}
              </Badge>
            ))}
          </div>
          
          {item.matched && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground mt-1"
            >
              Matched with: {item.matchedWith}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
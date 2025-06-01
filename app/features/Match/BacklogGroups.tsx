"use client";

import { useMatchStore } from "@/app/stores/match-store";
import { BacklogGroup } from "./BacklogGroup";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import BacklogGroupsHeader from "../Backlog/BacklogGroupsHeader";
import { BorderGradient, PatternOverlay } from "@/app/components/decorations/cardDecor";

export function BacklogGroups() {
  const { backlogGroups } = useMatchStore();
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return backlogGroups;
    
    return backlogGroups.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(group => group.items.length > 0);
  }, [backlogGroups, searchTerm]);

  const totalItems = backlogGroups.reduce((acc, group) => acc + group.items.length, 0);
  const matchedItems = backlogGroups.reduce((acc, group) => 
    acc + group.items.filter(item => item.matched).length, 0);

  return (
    <div 
      className="relative rounded-3xl overflow-hidden h-fit flex flex-col group"
      style={{
        background: `
          linear-gradient(135deg, 
            rgba(15, 23, 42, 0.95) 0%,
            rgba(30, 41, 59, 0.98) 25%,
            rgba(51, 65, 85, 0.95) 50%,
            rgba(30, 41, 59, 0.98) 75%,
            rgba(15, 23, 42, 0.95) 100%
          )
        `,
        border: '2px solid transparent',
        backgroundClip: 'padding-box',
        boxShadow: `
          0 0 0 1px rgba(71, 85, 105, 0.3),
          0 4px 6px -1px rgba(0, 0, 0, 0.3),
          0 20px 25px -5px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(148, 163, 184, 0.1)
        `
      }}
    >
      <BorderGradient />
      <PatternOverlay />

      {/* Header */}
      <BacklogGroupsHeader
        totalItems={totalItems}
        matchedItems={matchedItems}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        />
      
      {/* Groups */}
      <div 
        className="flex-1 overflow-y-auto p-6 space-y-4 relative"
        style={{
          background: `
            linear-gradient(180deg, 
              rgba(15, 23, 42, 0.7) 0%,
              rgba(30, 41, 59, 0.8) 100%
            )
          `
        }}
      >
        {/* Scroll Fade Effects */}
        <div 
          className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-10"
          style={{
            background: `
              linear-gradient(180deg, 
                rgba(30, 41, 59, 0.8) 0%,
                transparent 100%
              )
            `
          }}
        />
        <div 
          className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none z-10"
          style={{
            background: `
              linear-gradient(0deg, 
                rgba(30, 41, 59, 0.8) 0%,
                transparent 100%
              )
            `
          }}
        />

        {filteredGroups.map((group, index) => (
          <motion.div 
            key={group.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              delay: index * 0.08,
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
          >
            <BacklogGroup group={group} />
          </motion.div>
        ))}
        
        {filteredGroups.length === 0 && searchTerm && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-12 relative"
          >
            <div 
              className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center relative"
              style={{
                background: `
                  linear-gradient(135deg, 
                    rgba(71, 85, 105, 0.2) 0%,
                    rgba(100, 116, 139, 0.2) 100%
                  )
                `,
                border: '2px dashed rgba(71, 85, 105, 0.5)'
              }}
            >
              <Search className="w-8 h-8 text-slate-500" />
            </div>
            <p 
              className="text-sm font-medium text-slate-400"
            >
              No legends found for "{searchTerm}"
            </p>
          </motion.div>
        )}
      </div>

      <style jsx>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
'use client';

/**
 * StudioContentTabs
 *
 * Glass-morphism tabbed container for Generated Items and Rating Criteria.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ListOrdered, BarChart3 } from 'lucide-react';
import { useState } from 'react';

import { DURATION } from '@/lib/animations/motion-presets';
import { cn } from '@/lib/utils';
import { useStudioCriteria, useStudioItems } from '@/stores/studio-store';

import { CriteriaEditor } from './CriteriaEditor';
import { StudioItemsView } from './StudioItemsView';

type TabId = 'items' | 'criteria';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'items', label: 'Generated Items', icon: <ListOrdered className="w-4 h-4" /> },
  { id: 'criteria', label: 'Rating Criteria', icon: <BarChart3 className="w-4 h-4" /> },
];

export function StudioContentTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('items');
  const { criteriaMode } = useStudioCriteria();
  const { generatedItems } = useStudioItems();

  const hasCriteria = criteriaMode !== 'none';

  return (
    <div
      className="rounded-container overflow-hidden border border-white/[0.06] backdrop-blur-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 50%, rgba(255,255,255,0.02) 100%)',
      }}
    >
      {/* Tab Header */}
      <div className="flex items-center border-b border-white/[0.04] bg-white/[0.02]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'text-amber-300'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.id === 'items' && generatedItems.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-badge bg-white/[0.06] text-gray-400">
                {generatedItems.length}
              </span>
            )}
            {tab.id === 'criteria' && hasCriteria && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-amber-500" />
            )}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{
                  background: 'linear-gradient(90deg, rgba(251,191,36,0.6), rgba(245,158,11,0.8), rgba(251,191,36,0.6))',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'items' && (
            <motion.div
              key="items"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: DURATION.quick }}
            >
              <StudioItemsView />
            </motion.div>
          )}
          {activeTab === 'criteria' && (
            <motion.div
              key="criteria"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: DURATION.quick }}
            >
              <CriteriaEditor />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default StudioContentTabs;

'use client';

/**
 * StudioContentTabs
 *
 * Tabbed container switching between Generated Items and Rating Criteria views.
 * Full-width component providing space for rich criteria visualization.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListOrdered, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Surface } from '@/components/visual';
import { StudioItemsView } from './StudioItemsView';
import { CriteriaEditor } from './CriteriaEditor';
import { useStudioCriteria, useStudioItems } from '@/stores/studio-store';

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
    <Surface variant="glass" className="rounded-2xl overflow-hidden">
      {/* Tab Header */}
      <div className="flex items-center border-b border-gray-800/50 bg-gray-900/30">
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
              <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-gray-800 text-gray-400">
                {generatedItems.length}
              </span>
            )}
            {tab.id === 'criteria' && hasCriteria && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-amber-500" />
            )}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-amber-500 to-orange-500"
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
              transition={{ duration: 0.2 }}
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
              transition={{ duration: 0.2 }}
            >
              <CriteriaEditor />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Surface>
  );
}

export default StudioContentTabs;

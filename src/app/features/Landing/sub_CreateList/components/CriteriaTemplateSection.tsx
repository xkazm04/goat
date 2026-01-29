'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronDown, Check, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCriteriaStore } from '@/stores/criteria-store';
import { mapCategoryToTemplate, getTemplatesForCategory } from '@/lib/criteria/templates';
import type { CriteriaProfile } from '@/lib/criteria/types';

interface CriteriaTemplateSectionProps {
  /** Current list category (e.g., "Sports", "Movies") */
  category: string;
  /** Currently selected profile ID */
  selectedProfileId: string | null;
  /** Selection callback */
  onProfileSelect: (profileId: string | null) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * CriteriaTemplateSection - Criteria template selection UI for CompositionModal
 *
 * Displays a collapsible section with category-relevant criteria templates.
 * Users can select a template to enable multi-dimensional scoring for their list.
 */
export function CriteriaTemplateSection({
  category,
  selectedProfileId,
  onProfileSelect,
  className,
}: CriteriaTemplateSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const profiles = useCriteriaStore((state) => state.profiles);

  // Get filtered templates for the current category
  const filteredTemplates = useMemo(() => {
    const templateCategory = mapCategoryToTemplate(category);
    return getTemplatesForCategory(templateCategory);
  }, [category]);

  // Get selected profile details
  const selectedProfile = useMemo(() => {
    if (!selectedProfileId) return null;
    return profiles.find((p) => p.id === selectedProfileId) ?? null;
  }, [selectedProfileId, profiles]);

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleSelectProfile = (profileId: string | null) => {
    onProfileSelect(profileId);
    // Collapse after selection
    if (profileId !== null) {
      setIsExpanded(false);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Section Header - Clickable to expand/collapse */}
      <motion.button
        onClick={handleToggleExpand}
        className={cn(
          'w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200',
          'bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50',
          isExpanded && 'bg-slate-800/50 border-slate-600/50'
        )}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                Rating Criteria
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">
                Optional
              </span>
            </div>
            {selectedProfile ? (
              <p className="text-xs text-purple-400 mt-0.5">
                {selectedProfile.name} ({selectedProfile.criteria.length} criteria)
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-0.5">
                Add structured scoring to your rankings
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedProfile && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                handleSelectProfile(null);
              }}
              className="p-1 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-slate-400" />
          </motion.div>
        </div>
      </motion.button>

      {/* Expandable Template Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 pb-1 px-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* None / Skip Option */}
                <TemplateCard
                  profile={null}
                  isSelected={selectedProfileId === null}
                  onSelect={() => handleSelectProfile(null)}
                />

                {/* Category-filtered Templates */}
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    profile={template}
                    isSelected={selectedProfileId === template.id}
                    onSelect={() => handleSelectProfile(template.id)}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Individual template card component
 */
interface TemplateCardProps {
  profile: CriteriaProfile | null;
  isSelected: boolean;
  onSelect: () => void;
}

function TemplateCard({ profile, isSelected, onSelect }: TemplateCardProps) {
  const isNoneOption = profile === null;

  return (
    <motion.button
      onClick={onSelect}
      className={cn(
        'relative p-4 rounded-xl text-left transition-all duration-200',
        'border group',
        isSelected
          ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
          : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600/50'
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Selected Indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 p-1 rounded-full bg-purple-500"
        >
          <Check className="w-3 h-3 text-white" />
        </motion.div>
      )}

      {isNoneOption ? (
        // None / Skip Option
        <>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-slate-700/50">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <span className="text-sm font-medium text-white">None / Skip</span>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2">
            Create list without criteria scoring. You can add criteria later.
          </p>
        </>
      ) : (
        // Template Option
        <>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-purple-500/10">
              <Star className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <span className="text-sm font-medium text-white">{profile.name}</span>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2 mb-2">
            {profile.description}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">
              {profile.criteria.length} criteria
            </span>
            {profile.category !== 'universal' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 capitalize">
                {profile.category}
              </span>
            )}
          </div>
        </>
      )}
    </motion.button>
  );
}

export default CriteriaTemplateSection;

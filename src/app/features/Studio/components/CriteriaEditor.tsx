'use client';

/**
 * CriteriaEditor
 *
 * Full-width criteria configuration with split layout:
 * - Left: Display configuration for each criterion
 * - Right: Live preview of item card with overlays
 *
 * Modes:
 * - None: Empty state encouraging criteria usage
 * - Preset: Auto-applied category template with display config
 * - Custom: Create your own criteria with display config
 */

import { useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Check,
  Plus,
  RotateCcw,
  Wand2,
  BarChart3,
} from 'lucide-react';
import { SURFACE_ELEVATION } from '@/components/visual/depth/depth-tokens';
import { cn } from '@/lib/utils';
import { useStudioCriteria, useStudioMetadata, CriteriaMode } from '@/stores/studio-store';
import {
  mapCategoryToTemplate,
  getSuggestedTemplate,
} from '@/lib/criteria/templates';
import type { CriteriaProfile, Criterion } from '@/lib/criteria/types';
import { CriteriaDisplayConfigurator } from './CriteriaDisplayConfigurator';
import { CardPreviewPanel } from './CardPreviewPanel';

// Colors for criteria
const CRITERION_COLORS = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
];

export function CriteriaEditor() {
  const { criteriaMode, selectedProfileId, customProfile, setCriteriaMode, setSelectedProfileId, setCustomProfile } = useStudioCriteria();
  const { category } = useStudioMetadata();

  // Get the suggested template for current category (null if none exists)
  const suggestedTemplate = useMemo(() => {
    const templateCategory = mapCategoryToTemplate(category);
    return getSuggestedTemplate(templateCategory);
  }, [category]);

  // Auto-apply category template when switching to preset mode
  useEffect(() => {
    if (criteriaMode === 'preset' && suggestedTemplate && !selectedProfileId) {
      setSelectedProfileId(suggestedTemplate.id);
    }
  }, [criteriaMode, suggestedTemplate, selectedProfileId, setSelectedProfileId]);

  // Get active profile (either from preset or custom)
  const activeProfile = useMemo(() => {
    if (criteriaMode === 'custom' && customProfile) {
      return customProfile;
    }
    if (criteriaMode === 'preset' && suggestedTemplate) {
      return suggestedTemplate;
    }
    return null;
  }, [criteriaMode, customProfile, suggestedTemplate]);

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <ModeSelector
        mode={criteriaMode}
        onModeChange={setCriteriaMode}
        hasTemplate={!!suggestedTemplate}
        categoryName={category}
      />

      {/* Content based on mode */}
      <AnimatePresence mode="wait">
        {criteriaMode === 'none' && (
          <motion.div
            key="none"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <EmptyState
              onEnablePreset={() => {
                if (suggestedTemplate) {
                  setCriteriaMode('preset');
                } else {
                  setCriteriaMode('custom');
                }
              }}
              hasTemplate={!!suggestedTemplate}
              templateName={suggestedTemplate?.name}
            />
          </motion.div>
        )}

        {criteriaMode === 'preset' && activeProfile && (
          <motion.div
            key="preset"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <PresetView
              profile={activeProfile}
              onProfileChange={(updated) => {
                // When modifying preset, clone to custom
                const now = new Date().toISOString();
                setCustomProfile({
                  ...updated,
                  id: `custom-${Date.now()}`,
                  name: updated.name.includes('(Custom)') ? updated.name : `${updated.name} (Custom)`,
                  isTemplate: false,
                  createdAt: now,
                  updatedAt: now,
                });
                setCriteriaMode('custom');
              }}
              onCustomize={() => {
                // Clone preset to custom
                const now = new Date().toISOString();
                setCustomProfile({
                  ...activeProfile,
                  id: `custom-${Date.now()}`,
                  name: `${activeProfile.name} (Custom)`,
                  isTemplate: false,
                  createdAt: now,
                  updatedAt: now,
                });
                setCriteriaMode('custom');
              }}
            />
          </motion.div>
        )}

        {criteriaMode === 'preset' && !suggestedTemplate && (
          <motion.div
            key="no-template"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <NoTemplateState
              categoryName={category}
              onCreateCustom={() => setCriteriaMode('custom')}
            />
          </motion.div>
        )}

        {criteriaMode === 'custom' && (
          <motion.div
            key="custom"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <CustomEditor
              profile={customProfile}
              onProfileChange={setCustomProfile}
              suggestedTemplate={suggestedTemplate}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Mode Selector - Three buttons for None/Preset/Custom
 */
interface ModeSelectorProps {
  mode: CriteriaMode;
  onModeChange: (mode: CriteriaMode) => void;
  hasTemplate: boolean;
  categoryName: string;
}

function ModeSelector({ mode, onModeChange, hasTemplate, categoryName }: ModeSelectorProps) {
  const modes: { id: CriteriaMode; label: string; description: string }[] = [
    { id: 'none', label: 'None', description: 'Skip criteria scoring' },
    { id: 'preset', label: hasTemplate ? categoryName : 'Preset', description: hasTemplate ? 'Category template' : 'No template available' },
    { id: 'custom', label: 'Custom', description: 'Create your own' },
  ];

  return (
    <div className="flex gap-3">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onModeChange(m.id)}
          disabled={m.id === 'preset' && !hasTemplate}
          className={cn(
            'flex-1 p-4 rounded-xl border transition-all text-left',
            mode === m.id
              ? 'border-amber-500/50 bg-amber-500/10'
              : 'border-gray-700/50 bg-gray-900/30 hover:border-gray-600/50 hover:bg-gray-800/30',
            m.id === 'preset' && !hasTemplate && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={cn(
              'font-medium',
              mode === m.id ? 'text-amber-300' : 'text-gray-300'
            )}>
              {m.label}
            </span>
            {mode === m.id && (
              <div className="w-5 h-5 rounded-full bg-amber-500/30 border border-amber-500/50 flex items-center justify-center">
                <Check className="w-3 h-3 text-amber-300" />
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">{m.description}</p>
        </button>
      ))}
    </div>
  );
}

/**
 * Empty state when no criteria selected
 */
interface EmptyStateProps {
  onEnablePreset: () => void;
  hasTemplate: boolean;
  templateName?: string;
}

function EmptyState({ onEnablePreset, hasTemplate, templateName }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-2xl border border-gray-700/50 flex items-center justify-center mb-6"
        style={{ backgroundColor: SURFACE_ELEVATION.raised }}>
        <BarChart3 className="w-10 h-10 text-gray-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-300 mb-2">
        No Rating Criteria Selected
      </h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">
        Add criteria to enable multi-dimensional scoring. Rate items on specific
        attributes like skill, impact, or quality to create more nuanced rankings.
      </p>
      <button
        onClick={onEnablePreset}
        className="flex items-center gap-2 px-6 py-3 rounded-xl
          bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 hover:text-amber-300
          font-medium border border-amber-500/30 hover:border-amber-500/50 transition-all"
      >
        <Wand2 className="w-4 h-4" />
        {hasTemplate ? `Enable ${templateName}` : 'Create Custom Criteria'}
      </button>
    </div>
  );
}

/**
 * State when preset mode selected but no template for category
 */
interface NoTemplateStateProps {
  categoryName: string;
  onCreateCustom: () => void;
}

function NoTemplateState({ categoryName, onCreateCustom }: NoTemplateStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-gray-500 mb-4">
        No preset template available for &quot;{categoryName}&quot;
      </p>
      <button
        onClick={onCreateCustom}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Create Custom Criteria
      </button>
    </div>
  );
}

/**
 * Preset view with split layout
 */
interface PresetViewProps {
  profile: CriteriaProfile;
  onProfileChange: (profile: CriteriaProfile) => void;
  onCustomize: () => void;
}

function PresetView({ profile, onProfileChange, onCustomize }: PresetViewProps) {
  // Get colors for criteria
  const criteriaColors = profile.criteria.map((c, i) =>
    c.color || CRITERION_COLORS[i % CRITERION_COLORS.length]
  );

  const handleCriteriaChange = useCallback((criteria: Criterion[]) => {
    onProfileChange({
      ...profile,
      criteria,
      updatedAt: new Date().toISOString(),
    });
  }, [profile, onProfileChange]);

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            {profile.name}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">{profile.description}</p>
        </div>
        <button
          onClick={onCustomize}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
        >
          <Wand2 className="w-4 h-4" />
          Customize
        </button>
      </div>

      {/* Split Layout: Config (60%) | Preview (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Configuration (read-only for presets) */}
        <div className="lg:col-span-3 rounded-xl p-4 border border-gray-800/50"
          style={{ backgroundColor: SURFACE_ELEVATION.sunken }}>
          <CriteriaDisplayConfigurator
            criteria={profile.criteria}
            onCriteriaChange={handleCriteriaChange}
            colors={criteriaColors}
            allowAdd={false}
            readOnly={true}
          />
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-2 rounded-xl p-4 border border-gray-800/50"
          style={{ backgroundColor: SURFACE_ELEVATION.sunken }}>
          <CardPreviewPanel
            criteria={profile.criteria}
            criteriaColors={criteriaColors}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Custom criteria editor with split layout
 */
interface CustomEditorProps {
  profile: CriteriaProfile | null;
  onProfileChange: (profile: CriteriaProfile | null) => void;
  suggestedTemplate: CriteriaProfile | null;
}

function CustomEditor({ profile, onProfileChange, suggestedTemplate }: CustomEditorProps) {
  // Initialize with empty profile if none exists
  useEffect(() => {
    if (!profile) {
      const now = new Date().toISOString();
      onProfileChange({
        id: `custom-${Date.now()}`,
        name: 'Custom Criteria',
        description: 'Your custom rating criteria',
        category: 'custom',
        criteria: [
          {
            id: `criterion-${Date.now()}-1`,
            name: 'Quality',
            description: 'Overall quality and execution',
            weight: 50,
            minScore: 1,
            maxScore: 10,
            displayConfig: { displayType: 'ring-3' },
          },
          {
            id: `criterion-${Date.now()}-2`,
            name: 'Impact',
            description: 'Significance and influence',
            weight: 50,
            minScore: 1,
            maxScore: 10,
            displayConfig: { displayType: 'bar' },
          },
        ],
        isTemplate: false,
        createdBy: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }, [profile, onProfileChange]);

  const handleCriteriaChange = useCallback((criteria: Criterion[]) => {
    if (!profile) return;
    onProfileChange({
      ...profile,
      criteria,
      updatedAt: new Date().toISOString(),
    });
  }, [profile, onProfileChange]);

  const resetToTemplate = useCallback(() => {
    if (!suggestedTemplate) return;
    const now = new Date().toISOString();
    onProfileChange({
      ...suggestedTemplate,
      id: `custom-${Date.now()}`,
      name: `${suggestedTemplate.name} (Custom)`,
      isTemplate: false,
      createdAt: now,
      updatedAt: now,
    });
  }, [suggestedTemplate, onProfileChange]);

  if (!profile) return null;

  // Get colors for criteria
  const criteriaColors = profile.criteria.map((c, i) =>
    c.color || CRITERION_COLORS[i % CRITERION_COLORS.length]
  );

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Custom Criteria</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure display types for each criterion
          </p>
        </div>
        {suggestedTemplate && (
          <button
            onClick={resetToTemplate}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to {suggestedTemplate.name}
          </button>
        )}
      </div>

      {/* Split Layout: Config (60%) | Preview (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Configuration */}
        <div className="lg:col-span-3 rounded-xl p-4 border border-gray-800/50"
          style={{ backgroundColor: SURFACE_ELEVATION.sunken }}>
          <CriteriaDisplayConfigurator
            criteria={profile.criteria}
            onCriteriaChange={handleCriteriaChange}
            colors={criteriaColors}
            allowAdd={true}
            maxCriteria={8}
          />
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-2 rounded-xl p-4 border border-gray-800/50"
          style={{ backgroundColor: SURFACE_ELEVATION.sunken }}>
          <CardPreviewPanel
            criteria={profile.criteria}
            criteriaColors={criteriaColors}
          />
        </div>
      </div>
    </div>
  );
}

export default CriteriaEditor;

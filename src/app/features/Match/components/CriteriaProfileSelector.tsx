'use client';

/**
 * CriteriaProfileSelector
 * Component for selecting, creating, and managing criteria profiles
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronDown,
  Plus,
  Copy,
  Trash2,
  Share2,
  Download,
  Upload,
  Settings,
  Star,
  Edit2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCriteriaStore } from '@/stores/criteria-store';
import type { CriteriaProfile, Criterion, ScoreInputMode } from '@/lib/criteria/types';
import { mapCategoryToTemplate, getTemplatesForCategory } from '@/lib/criteria/templates';

/**
 * CriteriaProfileSelector Props
 */
interface CriteriaProfileSelectorProps {
  category?: string;
  onProfileSelect?: (profile: CriteriaProfile) => void;
  className?: string;
  showActions?: boolean;
}

/**
 * CriteriaProfileSelector Component
 */
export function CriteriaProfileSelector({
  category,
  onProfileSelect,
  className,
  showActions = true,
}: CriteriaProfileSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CriteriaProfile | null>(null);

  const {
    profiles,
    activeProfileId,
    setActiveProfile,
    deleteProfile,
    duplicateProfile,
    generateShareCode,
    exportProfile,
  } = useCriteriaStore();

  // Filter profiles by category
  const filteredProfiles = useMemo(() => {
    if (!category) return profiles;
    const templateCategory = mapCategoryToTemplate(category);
    return profiles.filter(
      (p) => p.category === templateCategory || p.category === 'universal'
    );
  }, [profiles, category]);

  // Get active profile
  const activeProfile = useMemo(() => {
    if (!activeProfileId) return null;
    return profiles.find((p) => p.id === activeProfileId) ?? null;
  }, [profiles, activeProfileId]);

  // Handle profile selection
  const handleSelect = useCallback(
    (profile: CriteriaProfile) => {
      setActiveProfile(profile.id);
      setIsOpen(false);
      onProfileSelect?.(profile);
    },
    [setActiveProfile, onProfileSelect]
  );

  // Handle duplicate
  const handleDuplicate = useCallback(
    (profile: CriteriaProfile) => {
      const newProfile = duplicateProfile(profile.id, `${profile.name} (Copy)`);
      if (newProfile) {
        handleSelect(newProfile);
      }
    },
    [duplicateProfile, handleSelect]
  );

  // Handle share
  const handleShare = useCallback(
    async (profile: CriteriaProfile) => {
      const shareCode = generateShareCode(profile.id);
      if (shareCode) {
        await navigator.clipboard.writeText(shareCode);
        // Could show toast here
      }
    },
    [generateShareCode]
  );

  // Handle export
  const handleExport = useCallback(
    (profile: CriteriaProfile) => {
      const data = exportProfile(profile.id);
      if (!data) return;

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${profile.name.replace(/\s+/g, '-').toLowerCase()}-criteria.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [exportProfile]
  );

  // Templates and custom profiles
  const templates = filteredProfiles.filter((p) => p.isTemplate);
  const customProfiles = filteredProfiles.filter((p) => !p.isTemplate);

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-3',
          'rounded-lg border border-border bg-card',
          'hover:bg-accent/50 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-primary" />
          <span className="font-medium">
            {activeProfile ? activeProfile.name : 'Select Criteria Profile'}
          </span>
          {activeProfile && (
            <span className="text-xs text-muted-foreground">
              ({activeProfile.criteria.length} criteria)
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 w-full mt-2',
              'rounded-lg border border-border bg-card shadow-lg',
              'max-h-[400px] overflow-y-auto'
            )}
          >
            {/* Templates Section */}
            {templates.length > 0 && (
              <div className="p-2 border-b border-border">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                  Templates
                </div>
                {templates.map((profile) => (
                  <ProfileOption
                    key={profile.id}
                    profile={profile}
                    isActive={activeProfileId === profile.id}
                    onSelect={() => handleSelect(profile)}
                    onDuplicate={showActions ? () => handleDuplicate(profile) : undefined}
                  />
                ))}
              </div>
            )}

            {/* Custom Profiles Section */}
            {customProfiles.length > 0 && (
              <div className="p-2 border-b border-border">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                  My Profiles
                </div>
                {customProfiles.map((profile) => (
                  <ProfileOption
                    key={profile.id}
                    profile={profile}
                    isActive={activeProfileId === profile.id}
                    onSelect={() => handleSelect(profile)}
                    onEdit={showActions ? () => setEditingProfile(profile) : undefined}
                    onDuplicate={showActions ? () => handleDuplicate(profile) : undefined}
                    onShare={showActions ? () => handleShare(profile) : undefined}
                    onExport={showActions ? () => handleExport(profile) : undefined}
                    onDelete={
                      showActions
                        ? () => {
                            deleteProfile(profile.id);
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            )}

            {/* Create New */}
            {showActions && (
              <div className="p-2">
                <button
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg',
                    'text-primary hover:bg-primary/10 transition-colors'
                  )}
                  onClick={() => {
                    setIsOpen(false);
                    setShowCreateModal(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-medium">Create New Profile</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingProfile) && (
        <CriteriaProfileEditor
          profile={editingProfile}
          category={category}
          onClose={() => {
            setShowCreateModal(false);
            setEditingProfile(null);
          }}
          onSave={(profile) => {
            handleSelect(profile);
            setShowCreateModal(false);
            setEditingProfile(null);
          }}
        />
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Profile Option Component
 */
interface ProfileOptionProps {
  profile: CriteriaProfile;
  isActive: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onShare?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
}

function ProfileOption({
  profile,
  isActive,
  onSelect,
  onEdit,
  onDuplicate,
  onShare,
  onExport,
  onDelete,
}: ProfileOptionProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={cn(
        'relative flex items-center justify-between px-3 py-2 rounded-lg',
        'cursor-pointer transition-colors',
        isActive ? 'bg-primary/10' : 'hover:bg-accent/50'
      )}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center gap-2">
        {isActive && <Check className="w-4 h-4 text-primary" />}
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('font-medium', isActive && 'text-primary')}>
              {profile.name}
            </span>
            {profile.isTemplate && (
              <span className="px-1.5 py-0.5 text-[10px] bg-muted rounded">
                Template
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {profile.criteria.length} criteria
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <AnimatePresence>
        {showActions && (onEdit || onDuplicate || onShare || onExport || onDelete) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {onEdit && (
              <button
                className="p-1 rounded hover:bg-accent"
                onClick={onEdit}
                title="Edit"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}
            {onDuplicate && (
              <button
                className="p-1 rounded hover:bg-accent"
                onClick={onDuplicate}
                title="Duplicate"
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
            {onShare && (
              <button
                className="p-1 rounded hover:bg-accent"
                onClick={onShare}
                title="Share"
              >
                <Share2 className="w-3 h-3" />
              </button>
            )}
            {onExport && (
              <button
                className="p-1 rounded hover:bg-accent"
                onClick={onExport}
                title="Export"
              >
                <Download className="w-3 h-3" />
              </button>
            )}
            {onDelete && !profile.isTemplate && (
              <button
                className="p-1 rounded hover:bg-destructive/20 text-destructive"
                onClick={onDelete}
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Criteria Profile Editor Modal
 */
interface CriteriaProfileEditorProps {
  profile?: CriteriaProfile | null;
  category?: string;
  onClose: () => void;
  onSave: (profile: CriteriaProfile) => void;
}

function CriteriaProfileEditor({
  profile,
  category,
  onClose,
  onSave,
}: CriteriaProfileEditorProps) {
  const { createProfile, updateProfile } = useCriteriaStore();

  const [name, setName] = useState(profile?.name ?? '');
  const [description, setDescription] = useState(profile?.description ?? '');
  const [criteria, setCriteria] = useState<Criterion[]>(
    profile?.criteria ?? []
  );

  const isEditing = !!profile;

  // Add new criterion
  const addCriterion = useCallback(() => {
    const newCriterion: Criterion = {
      id: `criterion-${Date.now()}`,
      name: '',
      description: '',
      weight: 20,
      minScore: 1,
      maxScore: 10,
    };
    setCriteria((prev) => [...prev, newCriterion]);
  }, []);

  // Update criterion
  const updateCriterionLocal = useCallback(
    (id: string, updates: Partial<Criterion>) => {
      setCriteria((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
    },
    []
  );

  // Remove criterion
  const removeCriterion = useCallback((id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (!name.trim() || criteria.length === 0) return;

    if (isEditing && profile) {
      updateProfile(profile.id, { name, description, criteria });
      onSave(profile);
    } else {
      const newProfile = createProfile({
        name,
        description,
        category: category ? mapCategoryToTemplate(category) : 'universal',
        criteria,
        isTemplate: false,
        createdBy: null,
      });
      onSave(newProfile);
    }
  }, [
    name,
    description,
    criteria,
    category,
    isEditing,
    profile,
    createProfile,
    updateProfile,
    onSave,
  ]);

  // Calculate total weight
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          'w-full max-w-xl max-h-[90vh] overflow-y-auto',
          'rounded-xl border border-border bg-card shadow-xl'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Profile' : 'Create Profile'}
          </h2>
          <button
            className="p-1 rounded hover:bg-accent"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Criteria"
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-border',
                'bg-background focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your criteria profile..."
              rows={2}
              className={cn(
                'w-full px-3 py-2 rounded-lg border border-border',
                'bg-background resize-none',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            />
          </div>

          {/* Criteria */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                Criteria ({criteria.length})
              </label>
              <span
                className={cn(
                  'text-xs',
                  totalWeight === 100
                    ? 'text-green-500'
                    : 'text-orange-500'
                )}
              >
                Total weight: {totalWeight}%
              </span>
            </div>

            <div className="space-y-2">
              {criteria.map((criterion, index) => (
                <div
                  key={criterion.id}
                  className="p-3 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={criterion.name}
                        onChange={(e) =>
                          updateCriterionLocal(criterion.id, {
                            name: e.target.value,
                          })
                        }
                        placeholder="Criterion name"
                        className={cn(
                          'w-full px-2 py-1 text-sm rounded border border-border',
                          'bg-background focus:outline-none focus:ring-1 focus:ring-ring'
                        )}
                      />
                      <input
                        type="text"
                        value={criterion.description}
                        onChange={(e) =>
                          updateCriterionLocal(criterion.id, {
                            description: e.target.value,
                          })
                        }
                        placeholder="Description"
                        className={cn(
                          'w-full px-2 py-1 text-xs rounded border border-border',
                          'bg-background focus:outline-none focus:ring-1 focus:ring-ring'
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-xs">Weight:</label>
                        <input
                          type="number"
                          value={criterion.weight}
                          onChange={(e) =>
                            updateCriterionLocal(criterion.id, {
                              weight: parseInt(e.target.value) || 0,
                            })
                          }
                          min={0}
                          max={100}
                          className={cn(
                            'w-16 px-2 py-1 text-xs rounded border border-border',
                            'bg-background focus:outline-none focus:ring-1 focus:ring-ring'
                          )}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                    <button
                      className="p-1 rounded hover:bg-destructive/20 text-destructive"
                      onClick={() => removeCriterion(criterion.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-3 py-2',
                  'rounded-lg border border-dashed border-border',
                  'text-muted-foreground hover:text-foreground hover:border-foreground',
                  'transition-colors'
                )}
                onClick={addCriterion}
              >
                <Plus className="w-4 h-4" />
                <span>Add Criterion</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button
            className={cn(
              'px-4 py-2 rounded-lg border border-border',
              'hover:bg-accent transition-colors'
            )}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={cn(
              'px-4 py-2 rounded-lg',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            disabled={!name.trim() || criteria.length === 0}
            onClick={handleSave}
          >
            {isEditing ? 'Save Changes' : 'Create Profile'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Input Mode Selector
 */
interface InputModeSelectorProps {
  value: ScoreInputMode;
  onChange: (mode: ScoreInputMode) => void;
  className?: string;
}

export function InputModeSelector({
  value,
  onChange,
  className,
}: InputModeSelectorProps) {
  const modes: { value: ScoreInputMode; label: string }[] = [
    { value: 'slider', label: 'Slider' },
    { value: 'stars', label: 'Stars' },
    { value: 'numeric', label: 'Numeric' },
  ];

  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-muted', className)}>
      {modes.map((mode) => (
        <button
          key={mode.value}
          className={cn(
            'px-3 py-1 text-sm rounded transition-colors',
            value === mode.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onChange(mode.value)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

export default CriteriaProfileSelector;

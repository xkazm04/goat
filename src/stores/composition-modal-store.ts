import { create } from 'zustand';
import { ListTemplate } from '@/types/templates';
import { TopList } from '@/types/top-lists';
import { Blueprint } from '@/types/blueprint';
import {
  ListIntent,
  ListIntentColor,
  ListIntentTimePeriod,
  ListIntentSource,
  createListIntent,
  updateListIntent,
  DEFAULT_LIST_INTENT,
  DEFAULT_LIST_INTENT_COLOR,
} from '@/types/list-intent';
import {
  listTemplateToIntent,
  topListToIntent,
  blueprintToIntent,
  showcasePresetToIntent,
} from '@/types/list-intent-transformers';

export type CompositionMode = 'create' | 'template' | 'clone' | 'blueprint';

export interface TemplateData {
  template: ListTemplate | null;
  sourceList: TopList | null;
  blueprint: Blueprint | null;
}

interface CompositionModalState {
  // Modal state
  isOpen: boolean;
  isExpanded: boolean;

  // Composition mode
  mode: CompositionMode;

  // Template data (when mode is 'template' or 'clone')
  templateData: TemplateData;

  // Show template gallery flag
  showTemplateGallery: boolean;

  // ListIntent - Single source of truth for list creation intent
  intent: ListIntent;

  // Actions
  openModal: () => void;
  closeModal: () => void;
  resetModal: () => void;
  setIsExpanded: (expanded: boolean) => void;

  // ListIntent-based actions
  updateIntent: (updates: Partial<ListIntent>) => void;
  setIntent: (intent: ListIntent) => void;
  getIntent: () => ListIntent;

  // Template actions
  setMode: (mode: CompositionMode) => void;
  setShowTemplateGallery: (show: boolean) => void;
  openWithTemplate: (template: ListTemplate) => void;
  openWithSourceList: (list: TopList) => void;
  openWithBlueprint: (blueprint: Blueprint) => void;
  clearTemplateData: () => void;

  // Pre-populate from showcase cards or other triggers
  populateFromPreset: (preset: {
    category?: string;
    subcategory?: string;
    timePeriod?: "all-time" | "decade" | "year";
    hierarchy?: string;
    title?: string;
    color?: {
      primary: string;
      secondary: string;
      accent: string;
    };
  }) => void;
}

// Default template data
const DEFAULT_TEMPLATE_DATA: TemplateData = {
  template: null,
  sourceList: null,
  blueprint: null,
};

export const useCompositionModalStore = create<CompositionModalState>((set, get) => ({
  // Initial state
  isOpen: false,
  isExpanded: false,
  mode: 'create',
  templateData: DEFAULT_TEMPLATE_DATA,
  showTemplateGallery: false,
  intent: DEFAULT_LIST_INTENT,

  // Open modal
  openModal: () => {
    set({
      isOpen: true,
      isExpanded: false,
      mode: 'create',
      templateData: DEFAULT_TEMPLATE_DATA,
      showTemplateGallery: false,
    });
  },

  // Close modal
  closeModal: () => {
    set({
      isOpen: false,
      isExpanded: false,
      mode: 'create',
      templateData: DEFAULT_TEMPLATE_DATA,
      showTemplateGallery: false,
    });
  },

  // Reset modal to default state
  resetModal: () => {
    set({
      isOpen: false,
      isExpanded: false,
      mode: 'create',
      templateData: DEFAULT_TEMPLATE_DATA,
      showTemplateGallery: false,
      intent: DEFAULT_LIST_INTENT,
    });
  },

  // Toggle expanded state
  setIsExpanded: (expanded) => {
    set({ isExpanded: expanded });
  },

  // ListIntent-based actions
  updateIntent: (updates) => {
    const currentIntent = get().intent;
    const newIntent = updateListIntent(currentIntent, updates);
    set({ intent: newIntent });
  },

  setIntent: (intent) => {
    set({ intent });
  },

  getIntent: () => get().intent,

  // Template actions
  setMode: (mode) => {
    set({ mode });
  },

  setShowTemplateGallery: (show) => {
    set({ showTemplateGallery: show });
  },

  openWithTemplate: (template) => {
    const newIntent = listTemplateToIntent(template);

    set({
      isOpen: true,
      isExpanded: false,
      mode: 'template',
      showTemplateGallery: false,
      templateData: {
        template,
        sourceList: null,
        blueprint: null,
      },
      intent: newIntent,
    });
  },

  openWithSourceList: (list) => {
    const newIntent = topListToIntent(list);

    set({
      isOpen: true,
      isExpanded: false,
      mode: 'clone',
      showTemplateGallery: false,
      templateData: {
        template: null,
        sourceList: list,
        blueprint: null,
      },
      intent: newIntent,
    });
  },

  openWithBlueprint: (blueprint) => {
    const newIntent = blueprintToIntent(blueprint);

    set({
      isOpen: true,
      isExpanded: false,
      mode: 'blueprint',
      showTemplateGallery: false,
      templateData: {
        template: null,
        sourceList: null,
        blueprint,
      },
      intent: newIntent,
    });
  },

  clearTemplateData: () => {
    const currentIntent = get().intent;
    const newIntent = updateListIntent(currentIntent, { source: 'create', sourceId: undefined });

    set({
      mode: 'create',
      templateData: DEFAULT_TEMPLATE_DATA,
      intent: newIntent,
    });
  },

  // Populate from preset (e.g., showcase card click or blueprint)
  populateFromPreset: (preset) => {
    const newIntent = showcasePresetToIntent({
      category: preset.category,
      subcategory: preset.subcategory,
      timePeriod: preset.timePeriod,
      hierarchy: preset.hierarchy,
      title: preset.title,
      color: preset.color,
    });

    set({
      isOpen: true,
      isExpanded: false,
      mode: 'create',
      templateData: DEFAULT_TEMPLATE_DATA,
      showTemplateGallery: false,
      intent: newIntent,
    });
  },
}));

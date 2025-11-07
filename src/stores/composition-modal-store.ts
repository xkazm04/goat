import { create } from 'zustand';

export interface CompositionFormData {
  selectedCategory: string;
  selectedSubcategory?: string;
  timePeriod: "all-time" | "decade" | "year";
  selectedDecade?: string;
  selectedYear?: string;
  hierarchy: number;
  isPredefined: boolean;
  title?: string;
  description?: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

interface CompositionModalState {
  // Modal state
  isOpen: boolean;
  isExpanded: boolean;

  // Form data
  formData: CompositionFormData;

  // Actions
  openModal: (config?: Partial<CompositionFormData>) => void;
  closeModal: () => void;
  resetModal: () => void;
  setIsExpanded: (expanded: boolean) => void;
  updateFormData: (updates: Partial<CompositionFormData>) => void;
  setFormData: (data: CompositionFormData) => void;

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

// Default color constant
const DEFAULT_COLOR = {
  primary: "#f59e0b",
  secondary: "#d97706",
  accent: "#fbbf24"
} as const;

// Default form data
const DEFAULT_FORM_DATA: CompositionFormData = {
  selectedCategory: "Sports",
  selectedSubcategory: "Basketball",
  timePeriod: "all-time",
  selectedDecade: "2020",
  selectedYear: "2024",
  hierarchy: 50,
  isPredefined: true,
  title: "",
  color: DEFAULT_COLOR
};

// Helper function to determine if category has subcategories
const getInitialSubcategory = (category: string, providedSubcategory?: string): string | undefined => {
  switch (category.toLowerCase()) {
    case 'sports':
      return providedSubcategory || 'Basketball';
    case 'music':
    case 'games':
    case 'stories':
      return undefined;
    default:
      return providedSubcategory;
  }
};

export const useCompositionModalStore = create<CompositionModalState>((set, get) => ({
  // Initial state
  isOpen: false,
  isExpanded: false,
  formData: DEFAULT_FORM_DATA,

  // Open modal with optional pre-populated data
  openModal: (config) => {
    const currentFormData = get().formData;

    set({
      isOpen: true,
      isExpanded: false,
      formData: config ? {
        ...currentFormData,
        ...config
      } : currentFormData
    });
  },

  // Close modal
  closeModal: () => {
    set({ isOpen: false, isExpanded: false });
  },

  // Reset modal to default state
  resetModal: () => {
    set({
      isOpen: false,
      isExpanded: false,
      formData: DEFAULT_FORM_DATA
    });
  },

  // Toggle expanded state
  setIsExpanded: (expanded) => {
    set({ isExpanded: expanded });
  },

  // Update partial form data
  updateFormData: (updates) => {
    set((state) => ({
      formData: {
        ...state.formData,
        ...updates
      }
    }));
  },

  // Set complete form data
  setFormData: (data) => {
    set({ formData: data });
  },

  // Populate from preset (e.g., showcase card click)
  populateFromPreset: (preset) => {
    const category = preset.category || DEFAULT_FORM_DATA.selectedCategory;
    const subcategory = getInitialSubcategory(category, preset.subcategory);
    const hierarchy = preset.hierarchy
      ? parseInt(preset.hierarchy.replace("Top ", ""))
      : DEFAULT_FORM_DATA.hierarchy;

    set({
      isOpen: true,
      isExpanded: false,
      formData: {
        selectedCategory: category,
        selectedSubcategory: subcategory,
        timePeriod: preset.timePeriod || DEFAULT_FORM_DATA.timePeriod,
        selectedDecade: DEFAULT_FORM_DATA.selectedDecade,
        selectedYear: DEFAULT_FORM_DATA.selectedYear,
        hierarchy,
        isPredefined: true,
        title: preset.title || "",
        color: preset.color || DEFAULT_COLOR
      }
    });
  }
}));

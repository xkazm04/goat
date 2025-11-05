// Composition to API Mapping Types

export interface CompositionResult {
  success: boolean;
  listId?: string;
  message: string;
  redirectUrl?: string;
  error?: string;
}

export interface CompositionData {
  selectedCategory: string;
  selectedSubcategory?: string;
  hierarchy: number;
  timePeriod: 'all-time' | 'decade' | 'year';
  selectedDecade?: string;
  selectedYear?: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  title?: string;
  description?: string;
}

export interface CreateListRequestFromComposition {
  title: string;
  category: string;
  subcategory?: string;
  size: number;
  time_period: string;
  description?: string;
  user: {
    email: string;
    name?: string;
  };
  metadata?: {
    selectedDecade?: string;
    selectedYear?: string;
    color: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
}

export interface CompositionMetadata {
  size: number;
  selectedCategory: string;
  selectedSubcategory?: string;
  timePeriod: 'all-time' | 'decade' | 'year';
  selectedDecade?: string;
  selectedYear?: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

// Implementation of the mapping function
export const mapCompositionToCreateListRequest = (
  compositionData: CompositionData,
  tempUserId: string
): CreateListRequestFromComposition => {
  // Generate title based on composition data
  const generateTitle = () => {
    if (compositionData.title) return compositionData.title;
    
    let title = `Top ${compositionData.hierarchy} ${compositionData.selectedCategory}`;
    
    if (compositionData.selectedSubcategory) {
      title += ` - ${compositionData.selectedSubcategory}`;
    }
    
    if (compositionData.timePeriod === 'decade' && compositionData.selectedDecade) {
      title += ` (${compositionData.selectedDecade}s)`;
    } else if (compositionData.timePeriod === 'year' && compositionData.selectedYear) {
      title += ` (${compositionData.selectedYear})`;
    }
    
    return title;
  };

  // Generate description
  const generateDescription = () => {
    if (compositionData.description) return compositionData.description;
    
    let description = `A curated list of the top ${compositionData.hierarchy} ${compositionData.selectedCategory.toLowerCase()}`;
    
    if (compositionData.selectedSubcategory) {
      description += ` in ${compositionData.selectedSubcategory.toLowerCase()}`;
    }
    
    if (compositionData.timePeriod === 'decade' && compositionData.selectedDecade) {
      description += ` from the ${compositionData.selectedDecade}s`;
    } else if (compositionData.timePeriod === 'year' && compositionData.selectedYear) {
      description += ` from ${compositionData.selectedYear}`;
    }
    
    return description + '.';
  };

  return {
    title: generateTitle(),
    category: compositionData.selectedCategory,
    subcategory: compositionData.selectedSubcategory,
    size: compositionData.hierarchy,
    time_period: compositionData.timePeriod,
    description: generateDescription(),
    user: {
      email: `temp-${tempUserId}@goat.app`,
      name: `User ${tempUserId.slice(-6)}`
    },
    metadata: {
      selectedDecade: compositionData.selectedDecade,
      selectedYear: compositionData.selectedYear,
      color: compositionData.color
    }
  };
};
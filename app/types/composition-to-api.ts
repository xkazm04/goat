import { CompositionData } from '@/app/features/Landing/CompositionModal';
import { CreateListRequest, CategoryEnum } from '@/app/types/top-lists';

export function mapCompositionToCreateListRequest(
  compositionData: CompositionData,
  userId: string
): CreateListRequest {
  // Map category string to enum
  const categoryMap: Record<string, CategoryEnum> = {
    'Sports': CategoryEnum.SPORTS,
    'Music': CategoryEnum.MUSIC,
    'Games': CategoryEnum.GAMES,
  };

  // Calculate time_period string based on composition data
  let timePeriodString = 'all';
  if (compositionData.timePeriod === 'decade') {
    timePeriodString = `${compositionData.selectedDecade}s`;
  } else if (compositionData.timePeriod === 'year') {
    timePeriodString = compositionData.selectedYear.toString();
  }

  // Generate title if not provided
  let generatedTitle = compositionData.title;
  if (!generatedTitle) {
    const categoryName = compositionData.selectedCategory;
    const subcategoryName = compositionData.selectedSubcategory;
    const hierarchySize = compositionData.hierarchy;
    const timePart = compositionData.timePeriod === 'all-time' 
      ? 'All Time' 
      : compositionData.timePeriod === 'decade' 
        ? `${compositionData.selectedDecade}s`
        : compositionData.selectedYear.toString();
    
    generatedTitle = `${hierarchySize} ${subcategoryName || categoryName} - ${timePart}`;
  }

  return {
    title: generatedTitle,
    category: categoryMap[compositionData.selectedCategory] || CategoryEnum.SPORTS,
    subcategory: compositionData.selectedSubcategory?.toLowerCase(),
    user_id: userId,
    predefined: compositionData.isPredefined,
    size: parseInt(compositionData.hierarchy.replace('Top ', '')),
    time_period: timePeriodString,
  };
}

export interface CompositionResult {
  success: boolean;
  listId?: string;
  message: string;
  redirectUrl?: string;
}
import { CompositionData } from '@/app/features/Landing/CompositionModal';

export interface CreateListRequest {
  title: string;
  category: string;
  subcategory?: string;
  user_id: string; // Make sure this is exactly what the backend expects
  predefined: boolean;
  size: number;
  time_period: string;
}

export interface CompositionResult {
  success: boolean;
  listId?: string;
  message: string;
  redirectUrl?: string;
}

export function mapCompositionToCreateListRequest(
  composition: CompositionData, 
  userId: string
): CreateListRequest {
  
  // DEBUG: Log the inputs
  console.log("Mapping composition:", composition);
  console.log("User ID input:", userId);
  
  // Generate title based on composition
  let title = composition.title;
  if (composition.isPredefined) {
    const categoryPart = composition.selectedSubcategory || composition.selectedCategory;
    const timePart = composition.timePeriod === 'all-time' ? 'All Time' :
                    composition.timePeriod === 'decade' ? `${composition.selectedDecade}s` :
                    composition.selectedYear.toString();
    
    title = `${composition.hierarchy} ${categoryPart} - ${timePart}`;
  }

  const result = {
    title,
    category: composition.selectedCategory.toLowerCase(),
    subcategory: composition.selectedSubcategory?.toLowerCase(),
    user_id: userId, // Pass the user ID exactly as received
    predefined: composition.isPredefined,
    size: parseInt(composition.hierarchy.replace(/\D/g, '')) || 50,
    time_period: composition.timePeriod === 'all-time' ? 'all' : 
                composition.timePeriod === 'decade' ? composition.selectedDecade.toString() :
                composition.selectedYear.toString()
  };
  
  // DEBUG: Log the result
  console.log("Mapped result:", result);
  
  return result;
}
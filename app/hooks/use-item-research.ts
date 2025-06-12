import { useMutation } from '@tanstack/react-query';
import { 
  itemResearchApi, 
  ItemResearchRequest, 
  ItemResearchResponse,
  ItemValidationRequest 
} from '@/app/lib/api/item-research';

export interface UseItemResearchOptions {
  onSuccess?: (data: ItemResearchResponse) => void;
  onError?: (error: Error) => void;
}

export const useItemResearch = (options?: UseItemResearchOptions) => {
  return useMutation({
    mutationFn: (request: ItemResearchRequest) => itemResearchApi.researchItem(request),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
};

export const useItemValidation = (options?: UseItemResearchOptions) => {
  return useMutation({
    mutationFn: (request: ItemValidationRequest) => itemResearchApi.validateItem(request),
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
};

// Helper hook that combines validation and research
export const useItemResearchFlow = (options?: UseItemResearchOptions) => {
  const researchMutation = useItemResearch(options);
  const validationMutation = useItemValidation(options);

  return {
    // Step 1: Validate item
    validateItem: validationMutation.mutate,
    validationResult: validationMutation.data,
    isValidating: validationMutation.isPending,
    validationError: validationMutation.error,

    // Step 2: Research item (after validation)
    researchItem: researchMutation.mutate,
    researchResult: researchMutation.data,
    isResearching: researchMutation.isPending,
    researchError: researchMutation.error,

    // Combined states
    isLoading: validationMutation.isPending || researchMutation.isPending,
    hasError: validationMutation.isError || researchMutation.isError,
    error: validationMutation.error || researchMutation.error,

    // Reset functions
    resetValidation: validationMutation.reset,
    resetResearch: researchMutation.reset,
    resetAll: () => {
      validationMutation.reset();
      researchMutation.reset();
    },
  };
};
import { useState } from "react";
import { useTempUser } from "@/hooks/use-temp-user";
import { toast } from "@/hooks/use-toast";
import { useListStore } from "@/stores/use-list-store";
import { useRouter } from "next/navigation";
import { CompositionResult } from "@/types/composition-to-api";
import { ShimmerBtn } from "@/components/app/button/AnimButtons";
import { ListIntent, validateListIntent } from "@/types/list-intent";
import { listIntentToCreateRequest, listIntentToMetadata } from "@/types/list-intent-transformers";
import { CreationProgressIndicator, CreationStep } from "./sub_CreateList/components/CreationProgressIndicator";
import { categoryHasSubcategories, isValidSubcategory } from "@/lib/config/category-config";

type Props = {
    intent: ListIntent;
    createListMutation: {
        isPending: boolean;
        mutateAsync: (request: any) => Promise<any>;
    };
    onSuccess?: (result: CompositionResult) => void;
    onClose: () => void;
}

const ListCreateButton = ({ intent, createListMutation, onSuccess, onClose }: Props) => {
     const router = useRouter();
     const { tempUserId, isLoaded } = useTempUser();
    const { setCreationResult, setIsCreating, setCreationError } = useListStore();
    const [creationStep, setCreationStep] = useState<CreationStep | null>(null);
    const isButtonDisabled = createListMutation.isPending || !isLoaded || !tempUserId || creationStep !== null;
    const getButtonText = () => {
        if (creationStep !== null) return "";
        if (!isLoaded) return "LOADING...";
        return "START";
    };

    const validateIntent = (): { isValid: boolean; errors: string[] } => {
        // Use the ListIntent validator
        const validation = validateListIntent(intent);
        const errors: string[] = [...validation.errors];

        // Additional validation for custom lists (non-predefined)
        if (!intent.isPredefined && (!intent.title || !intent.title.trim())) {
            errors.push("Please provide a title for your custom list");
        }

        // Validate subcategory for categories that require it (e.g., Sports)
        if (intent.category && categoryHasSubcategories(intent.category)) {
            if (!intent.subcategory) {
                errors.push(`Please select a subcategory for ${intent.category}`);
            } else if (!isValidSubcategory(intent.category, intent.subcategory)) {
                errors.push(`Invalid subcategory for ${intent.category}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    };
    const handleCreate = async () => {
        // Early return if button is disabled (aria-disabled doesn't prevent clicks)
        if (isButtonDisabled) {
            return;
        }

        if (!isLoaded || !tempUserId) {
            toast({
                title: "Not Ready",
                description: "Please wait while we prepare your session...",
            });
            return;
        }

        // Step 1: Validating
        setCreationStep("validating");

        const validation = validateIntent();
        if (!validation.isValid) {
            setCreationStep(null);
            toast({
                title: "Validation Error",
                description: validation.errors.join(", "),
            });
            return;
        }

        setIsCreating(true);
        setCreationError(null);

        try {
            // Step 2: Creating list - Use ListIntent transformation pipeline
            setCreationStep("creating");
            const createListRequest = listIntentToCreateRequest(intent, tempUserId);

            console.log("Creating list with enhanced endpoint:", createListRequest);
            const result = await createListMutation.mutateAsync(createListRequest);

            // Step 3: Loading items - Use ListIntent to generate metadata
            setCreationStep("loading");
            const enhancedListData: any = {
                ...result.list,
                metadata: listIntentToMetadata(intent),
            };

            setCreationResult({
                list: enhancedListData,
                user: result.user,
                is_new_user: result.is_new_user,
                success: result.success
            });

            // Step 4: Complete
            setCreationStep("complete");

            // Brief pause to show completion before navigating
            await new Promise(resolve => setTimeout(resolve, 300));

            toast({
                title: "List Created!",
                description: `"${result.list.title}" is ready for ranking!`,
            });

            const compositionResult: CompositionResult = {
                success: true,
                listId: result.list.id,
                message: `Successfully created "${result.list.title}"!`,
                redirectUrl: `/match-test?list=${result.list.id}`
            };
            onSuccess?.(compositionResult);
            onClose();

            router.push(`/match-test?list=${result.list.id}`);

        } catch (error) {
            console.error("Error creating list:", error);
            setCreationStep(null);

            const errorMessage = error instanceof Error ? error.message : "Failed to create list";
            setCreationError(errorMessage);

            toast({
                title: "Creation Failed",
                description: errorMessage,
            });

            const failureResult: CompositionResult = {
                success: false,
                message: errorMessage
            };
            onSuccess?.(failureResult);
        }
    };
    const isPending = createListMutation.isPending || creationStep !== null;

    return (
        <div className="flex flex-col items-center gap-4">
            <button
                type="button"
                onClick={handleCreate}
                aria-disabled={isButtonDisabled}
                aria-busy={isPending}
                aria-label={isPending ? "Creating list..." : "Create list"}
                className={`
                    transition-all duration-300 ease-out
                    ${isButtonDisabled
                        ? 'opacity-50 scale-95 cursor-not-allowed'
                        : 'opacity-100 scale-100 cursor-pointer hover:scale-105'
                    }
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
                `}
                data-testid="list-create-btn"
            >
                <ShimmerBtn
                    label={getButtonText()}
                />
            </button>

            <CreationProgressIndicator
                currentStep={creationStep ?? "validating"}
                isVisible={creationStep !== null}
            />
        </div>
    );
}

export default ListCreateButton;
import { useState, useCallback } from "react";
import { useTempUser } from "@/hooks/use-temp-user";
import { useListStore } from "@/stores/use-list-store";
import { useRouter } from "next/navigation";
import { CompositionResult } from "@/types/composition-to-api";
import { ShimmerBtn } from "@/components/app/button/AnimButtons";
import { ListIntent } from "@/types/list-intent";
import { listIntentToMetadata } from "@/types/list-intent-transformers";
import { CreationProgressIndicator, CreationStep } from "./sub_CreateList/components/CreationProgressIndicator";
import {
  listCreationService,
  CreationStep as ServiceCreationStep,
} from "@/services/list-creation-service";
import { toast } from "@/hooks/use-toast";

type Props = {
    intent: ListIntent;
    createListMutation: {
        isPending: boolean;
        mutateAsync: (request: any) => Promise<any>;
    };
    onSuccess?: (result: CompositionResult) => void;
    onClose: () => void;
}

/**
 * ListCreateButton - Unified list creation button
 *
 * Uses the centralized ListCreationService for validation, transformation,
 * and error handling. This component now serves as a thin UI wrapper.
 */
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

    const handleCreate = useCallback(async () => {
        // Early return if button is disabled
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

        setIsCreating(true);
        setCreationError(null);

        // Progress handler that maps service steps to component steps
        const onProgress = (step: ServiceCreationStep) => {
            // Map service steps to component steps (they use the same type)
            setCreationStep(step === 'idle' ? null : step as CreationStep);
        };

        // Use the unified service for list creation
        const result = await listCreationService.createList(intent, {
            userId: tempUserId,
            onProgress,
        });

        if (result.success && result.list) {
            // Store the creation result with metadata
            const enhancedListData: any = {
                ...result.list,
                metadata: listIntentToMetadata(intent),
            };

            // Convert API user shape to store UserInfo shape
            const userInfo = result.user
                ? {
                      id: result.user.id,
                      is_temporary: result.isNewUser ?? false,
                      email: result.user.email,
                      display_name: result.user.name,
                  }
                : { id: '', is_temporary: true };

            setCreationResult({
                list: enhancedListData,
                user: userInfo,
                is_new_user: result.isNewUser ?? false,
                success: result.success
            });

            // Brief pause to show completion before navigating
            await new Promise(resolve => setTimeout(resolve, 300));

            toast({
                title: "List Created!",
                description: `"${result.list.title}" is ready for ranking!`,
            });

            const compositionResult: CompositionResult = {
                success: true,
                listId: result.listId,
                message: `Successfully created "${result.list.title}"!`,
                redirectUrl: `/match-test?list=${result.listId}`
            };
            onSuccess?.(compositionResult);
            onClose();

            router.push(`/match-test?list=${result.listId}`);
        } else {
            // Handle error
            setCreationStep(null);
            const errorMessage = result.error || "Failed to create list";
            setCreationError(errorMessage);

            toast({
                title: "Creation Failed",
                description: result.validationErrors?.length
                    ? result.validationErrors.join(", ")
                    : errorMessage,
            });

            const failureResult: CompositionResult = {
                success: false,
                message: errorMessage
            };
            onSuccess?.(failureResult);
        }

        setIsCreating(false);
    }, [
        isButtonDisabled,
        isLoaded,
        tempUserId,
        intent,
        setIsCreating,
        setCreationError,
        setCreationResult,
        onSuccess,
        onClose,
        router,
    ]);

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

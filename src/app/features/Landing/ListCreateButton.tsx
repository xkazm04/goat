import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

import { ShimmerBtn } from "@/components/app/button/AnimButtons";
import { useTempUser } from "@/hooks/use-temp-user";
import { toast } from "@/hooks/use-toast";
import {
  ctaButtonVariants,
  successCheckVariants,
  successPulseVariants,
  confettiVariants,
  prefersReducedMotion,
} from "@/lib/animations/micro-interactions";
import {
  listCreationService,
  CreationStep as ServiceCreationStep,
} from "@/services/list-creation-service";
import { useListStore } from "@/stores/use-list-store";
import { CompositionResult } from "@/types/composition-to-api";
import { ListIntent } from "@/types/list-intent";
import { listIntentToMetadata } from "@/types/list-intent-transformers";

import { CreationProgressIndicator, CreationStep } from "./sub_CreateList/components/CreationProgressIndicator";


// Confetti colors
const CONFETTI_COLORS = [
  '#06b6d4', // cyan
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#22c55e', // green
  '#ec4899', // pink
];

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
 * and error handling. Features enhanced micro-interactions and success celebrations.
 */
const ListCreateButton = ({ intent, createListMutation, onSuccess, onClose }: Props) => {
    const router = useRouter();
    const { tempUserId, isLoaded } = useTempUser();
    const { setCreationResult, setIsCreating, setCreationError } = useListStore();
    const [creationStep, setCreationStep] = useState<CreationStep | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    const reducedMotion = prefersReducedMotion();
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
            // Show success celebration
            setShowSuccess(true);

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

            // Extended pause to show celebration before navigating
            await new Promise(resolve => setTimeout(resolve, reducedMotion ? 300 : 800));

            toast({
                title: "List Created!",
                description: `"${result.list.title}" is ready for ranking!`,
            });

            const compositionResult: CompositionResult = {
                success: true,
                listId: result.listId,
                message: `Successfully created "${result.list.title}"!`,
                redirectUrl: `/goat?list=${result.listId}`
            };
            onSuccess?.(compositionResult);
            onClose();

            router.push(`/goat?list=${result.listId}`);
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
        reducedMotion,
    ]);

    const isPending = createListMutation.isPending || creationStep !== null;

    return (
        <div className="flex flex-col items-center gap-4 relative">
            {/* Success celebration overlay */}
            <AnimatePresence>
                {showSuccess && !reducedMotion && (
                    <>
                        {/* Pulse rings */}
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={`pulse-${i}`}
                                className="absolute inset-0 rounded-container pointer-events-none"
                                style={{
                                    border: '2px solid',
                                    borderColor: intent.color.primary,
                                }}
                                variants={successPulseVariants}
                                initial="hidden"
                                animate="visible"
                                custom={i}
                            />
                        ))}

                        {/* Confetti particles */}
                        {Array.from({ length: 20 }).map((_, i) => (
                            <motion.div
                                key={`confetti-${i}`}
                                className="absolute w-2 h-2 rounded-full pointer-events-none"
                                style={{
                                    backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                                    left: '50%',
                                    top: '50%',
                                }}
                                variants={confettiVariants}
                                initial="hidden"
                                animate="visible"
                                custom={i}
                            />
                        ))}
                    </>
                )}
            </AnimatePresence>

            {/* Main button */}
            <motion.button
                type="button"
                onClick={handleCreate}
                onMouseDown={() => setIsPressed(true)}
                onMouseUp={() => setIsPressed(false)}
                onMouseLeave={() => setIsPressed(false)}
                aria-disabled={isButtonDisabled}
                aria-busy={isPending}
                aria-label={isPending ? "Creating list..." : "Create list"}
                className={`
                    relative rounded-container focus-ring
                    ${isButtonDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
                variants={ctaButtonVariants}
                initial="initial"
                animate={isButtonDisabled ? "initial" : isPressed ? "tap" : "initial"}
                whileHover={isButtonDisabled ? undefined : "hover"}
                whileTap={isButtonDisabled ? undefined : "tap"}
                style={{
                    opacity: isButtonDisabled ? 0.5 : 1,
                    boxShadow: showSuccess
                        ? `0 0 40px ${intent.color.primary}60`
                        : undefined,
                }}
                data-testid="list-create-btn"
            >
                {/* Success checkmark overlay */}
                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            className="absolute inset-0 flex items-center justify-center z-10 rounded-container"
                            style={{ backgroundColor: `${intent.color.primary}20` }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.svg
                                className="w-12 h-12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={intent.color.primary}
                                strokeWidth={3}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                variants={successCheckVariants}
                                initial="hidden"
                                animate="visible"
                            >
                                <polyline points="20 6 9 17 4 12" />
                            </motion.svg>
                        </motion.div>
                    )}
                </AnimatePresence>

                <ShimmerBtn
                    label={getButtonText()}
                />
            </motion.button>

            <CreationProgressIndicator
                currentStep={creationStep ?? "validating"}
                isVisible={creationStep !== null}
            />
        </div>
    );
}

export default ListCreateButton;

import { useTempUser } from "@/hooks/use-temp-user";
import { toast } from "@/hooks/use-toast";
import { useListStore } from "@/stores/use-list-store";
import { useRouter } from "next/navigation";
import { CompositionResult, mapCompositionToCreateListRequest } from "@/types/composition-to-api";
import { ShimmerBtn } from "@/components/app/button/AnimButtons";
import { CompositionData } from "./CompositionModal";

type Props = {
    compositionData: CompositionData;
    createListMutation: {
        isPending: boolean;
        mutateAsync: (request: any) => Promise<any>;
    };
    onSuccess?: (result: CompositionResult) => void;
    onClose: () => void;
}

const ListCreateButton = ({compositionData, createListMutation, onSuccess, onClose }: Props) => {
     const router = useRouter();
     const { tempUserId, isLoaded } = useTempUser();
    const { setCreationResult, setIsCreating, setCreationError } = useListStore();
    const isButtonDisabled = createListMutation.isPending || !isLoaded || !tempUserId;
    const getButtonText = () => {
        if (createListMutation.isPending) return "CREATING...";
        if (!isLoaded) return "LOADING...";
        return "START";
    };

    const validateComposition = (): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];
        if (!compositionData.selectedCategory) {
            errors.push("Please select a category");
        }
        if (!compositionData.isPredefined && (!compositionData.title || !compositionData.title.trim())) {
            errors.push("Please provide a title for your custom list");
        }
        if (compositionData.timePeriod === "decade" && !compositionData.selectedDecade) {
            errors.push("Please select a decade");
        }
        if (compositionData.timePeriod === "year" && !compositionData.selectedYear) {
            errors.push("Please select a year");
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    };
    const handleCreate = async () => {
        if (!isLoaded || !tempUserId) {
            toast({
                title: "Not Ready",
                description: "Please wait while we prepare your session...",
            });
            return;
        }

        const validation = validateComposition();
        if (!validation.isValid) {
            toast({
                title: "Validation Error",
                description: validation.errors.join(", "),
            });
            return;
        }
        setIsCreating(true);
        setCreationError(null);

        try {
            const createListRequest = mapCompositionToCreateListRequest(compositionData, tempUserId);

            console.log("Creating list with enhanced endpoint:", createListRequest);
            const result = await createListMutation.mutateAsync(createListRequest);
            const enhancedListData: any = {
                ...result.list,
                metadata: {
                    size: compositionData.hierarchy,
                    selectedCategory: compositionData.selectedCategory,
                    selectedSubcategory: compositionData.selectedSubcategory,
                    timePeriod: compositionData.timePeriod,
                    selectedDecade: compositionData.selectedDecade ? parseInt(compositionData.selectedDecade) : undefined,
                    selectedYear: compositionData.selectedYear ? parseInt(compositionData.selectedYear) : undefined,
                    color: compositionData.color
                }
            };

            setCreationResult({
                list: enhancedListData,
                user: result.user,
                is_new_user: result.is_new_user,
                success: result.success
            });

            toast({
                title: "List Created! 🎉",
                description: `"${result.list.title}" is ready for ranking!`,
            });

            const compositionResult: CompositionResult = {
                success: true,
                listId: result.list.id,
                message: `Successfully created "${result.list.title}"!`,
                redirectUrl: `/match?list=${result.list.id}`
            };
            onSuccess?.(compositionResult);
            onClose();

            router.push(`/match`);

        } catch (error) {
            console.error("Error creating list:", error);

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
    return <>
        <div
            onClick={isButtonDisabled ? undefined : handleCreate}
            className={`cursor-pointer ${isButtonDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <ShimmerBtn
                label={getButtonText()}
            />
        </div>
    </>
}

export default ListCreateButton;
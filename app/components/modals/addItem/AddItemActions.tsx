import { Check } from "lucide-react";

type Props = {
    handleClose: () => void;
    isSubmitting: boolean;
    title: string;
}

const AddItemActions = ({handleClose, isSubmitting, title}: Props) => {
    return <div className="flex gap-3">
        <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 text-slate-300 hover:text-slate-200"
            style={{
                background: 'rgba(51, 65, 85, 0.5)',
                border: '1px solid rgba(71, 85, 105, 0.4)'
            }}
        >
            Cancel
        </button>
        <button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 text-white flex items-center justify-center gap-2"
            style={{
                background: !title.trim() || isSubmitting
                    ? 'rgba(71, 85, 105, 0.5)'
                    : `linear-gradient(135deg, 
                              rgba(59, 130, 246, 0.8) 0%,
                              rgba(147, 51, 234, 0.8) 100%
                            )`,
                boxShadow: !title.trim() || isSubmitting
                    ? 'none'
                    : '0 2px 8px rgba(59, 130, 246, 0.3)'
            }}
        >
            {isSubmitting ? (
                <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding...
                </>
            ) : (
                <>
                    <Check className="w-4 h-4" />
                    Add Item
                </>
            )}
        </button>
    </div>
}

export default AddItemActions;
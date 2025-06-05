import { Plus, X } from "lucide-react";

type Props = {
    groupTitle: string;
    handleClose: () => void;
    isSubmitting: boolean;
}

const AddItemHeader = ({groupTitle, handleClose, isSubmitting}: Props) => {
    return <div
        className="px-6 py-4 border-b flex items-center justify-between"
        style={{
            borderColor: 'rgba(71, 85, 105, 0.4)',
            background: `
                      linear-gradient(135deg, 
                        rgba(30, 41, 59, 0.8) 0%,
                        rgba(51, 65, 85, 0.9) 100%
                      )
                    `
        }}
    >
        <div className="flex items-center gap-3">
            <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                    background: `
                          linear-gradient(135deg, 
                            #4c1d95 0%, 
                            #7c3aed 50%,
                            #3b82f6 100%
                          )
                        `
                }}
            >
                <Plus className="w-4 h-4 text-white" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-200">
                    Add New Item
                </h2>
                <p className="text-sm text-slate-400">
                    to {groupTitle}
                </p>
            </div>
        </div>
        <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg transition-colors hover:bg-slate-700/50 disabled:opacity-50"
        >
            <X className="w-5 h-5 text-slate-400" />
        </button>
    </div>
}

export default AddItemHeader;
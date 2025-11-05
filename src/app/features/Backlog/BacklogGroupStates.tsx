import { AlertCircle, Loader2, RefreshCcw } from "lucide-react"
import { ListConfiguration } from "@/stores/use-list-store"

type LoadingStateProps = {
    className?: string;
    currentList: ListConfiguration | null;
}

type ErrorStateProps = {
    className?: string;
    onRetry: () => void;
    error: Error;
}

export const LoadingState = ({ currentList, className }: LoadingStateProps) => {
    return <div className={className}>
        <div
            className="relative rounded-3xl overflow-hidden h-fit flex flex-col items-center justify-center p-12"
            style={{
                background: `
              linear-gradient(135deg, 
                rgba(15, 23, 42, 0.95) 0%,
                rgba(30, 41, 59, 0.98) 50%,
                rgba(51, 65, 85, 0.95) 100%
              )
            `,
                border: '2px solid rgba(71, 85, 105, 0.3)',
                boxShadow: `
              0 4px 6px -1px rgba(0, 0, 0, 0.3),
              0 20px 25px -5px rgba(0, 0, 0, 0.4)
            `
            }}
        >
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Loading Collection</h3>
            <p className="text-sm text-slate-400 text-center">
                Fetching {currentList?.category} items from the database...
            </p>
        </div>
    </div>
}

export const ErrorState = ({ className, onRetry, error }: ErrorStateProps) => {
    return <div className={className}>
        <div
            className="relative rounded-3xl overflow-hidden h-fit flex flex-col items-center justify-center p-12"
            style={{
                background: `
              linear-gradient(135deg, 
                rgba(15, 23, 42, 0.95) 0%,
                rgba(30, 41, 59, 0.98) 50%,
                rgba(51, 65, 85, 0.95) 100%
              )
            `,
                border: '2px solid rgba(239, 68, 68, 0.3)',
                boxShadow: `
              0 4px 6px -1px rgba(0, 0, 0, 0.3),
              0 20px 25px -5px rgba(0, 0, 0, 0.4)
            `
            }}
        >
            <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Failed to Load</h3>
            <p className="text-sm text-slate-400 text-center mb-4">
                {error.message || 'Could not fetch items from the database'}
            </p>
            <button
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg border border-red-500/30 transition-colors"
            >
                <RefreshCcw className="w-4 h-4" />
                Retry
            </button>
        </div>
    </div>
}
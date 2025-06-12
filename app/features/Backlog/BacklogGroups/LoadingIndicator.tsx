import { Loader2 } from "lucide-react";

interface LoadingIndicatorProps {
  isLoading: boolean;
  hasData: boolean;
}

export function LoadingIndicator({ isLoading, hasData }: LoadingIndicatorProps) {
  if (!isLoading || !hasData) return null;

  return (
    <div className="absolute top-4 right-4 z-20">
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg backdrop-blur-sm">
        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
        <span className="text-xs text-blue-400">Updating...</span>
      </div>
    </div>
  );
}
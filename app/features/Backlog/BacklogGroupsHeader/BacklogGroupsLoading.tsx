import {motion}  from "framer-motion";
const BacklogGroupsLoading = ({ progress }: { progress: { totalGroups: number; loadedGroups: number; isLoading: boolean; percentage: number } }) => {
  if (!progress.isLoading && progress.percentage >= 100) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="absolute w-full"
    >
      <div className="flex items-center gap-3 text-sm">
        <div className="flex-1">
          {/* Progress Bar */}
          <div className="w-full bg-slate-700/50 rounded-full h-0.5 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percentage}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          
          {/* Estimated time remaining */}
          {progress.isLoading && progress.totalGroups > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-1 text-xs text-slate-400"
            >
              {progress.loadedGroups > 0 && progress.loadedGroups < progress.totalGroups && (
                <>
                  Estimated time: ~{Math.ceil((progress.totalGroups - progress.loadedGroups) * 0.15)}s remaining
                </>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BacklogGroupsLoading;
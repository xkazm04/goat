import { motion } from "framer-motion";

const InitialLoadingOverlay = ({ isVisible, progress }: { 
  isVisible: boolean; 
  progress?: { totalGroups: number; loadedGroups: number; isLoading: boolean; percentage: number } 
}) => {
  if (!isVisible) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{
        background: `
          radial-gradient(ellipse at center, 
            rgba(15, 23, 42, 0.75) 0%,
            rgba(30, 41, 59, 0.85) 40%,
            rgba(15, 23, 42, 0.95) 100%
          )
        `,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        // Add subtle noise texture
        backgroundImage: `
          radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.02) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.03) 0%, transparent 50%)
        `
      }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, y: 20, opacity: 0 }}
        transition={{ 
          delay: 0.1,
          type: "spring",
          stiffness: 300,
          damping: 20
        }}
        className="text-center px-8 py-6 rounded-2xl relative overflow-hidden"
        style={{
          background: `
            linear-gradient(145deg, 
              rgba(30, 41, 59, 0.9) 0%, 
              rgba(51, 65, 85, 0.95) 50%,
              rgba(30, 41, 59, 0.9) 100%
            )
          `,
          border: '1px solid rgba(71, 85, 105, 0.5)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 4px 16px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(148, 163, 184, 0.1)
          `
        }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-30">
          <motion.div
            animate={{ 
              background: [
                'radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
                'radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
                'radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)'
              ]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0"
          />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 border-r-blue-400 rounded-full"
            />
          </div>
          
          <motion.h3 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg font-semibold text-slate-200 mb-2"
          >
            Loading Collection
          </motion.h3>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-slate-400 mb-4"
          >
            Fetching groups and items...
          </motion.p>
          
          {progress && progress.totalGroups > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-64 mx-auto"
            >
              <div className="flex items-center justify-between mb-2 text-xs text-slate-300">
                <span>Progress</span>
                <span className="font-mono">
                  {progress.loadedGroups}/{progress.totalGroups} groups
                </span>
              </div>
              
              <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                <motion.div
                  className="h-full rounded-full relative overflow-hidden"
                  style={{
                    background: `
                      linear-gradient(90deg, 
                        rgba(59, 130, 246, 0.8) 0%, 
                        rgba(99, 102, 241, 0.9) 50%, 
                        rgba(59, 130, 246, 0.8) 100%
                      )
                    `
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {/* Animated shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.div>
              </div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-2 text-xs text-slate-400 font-mono"
              >
                {progress.percentage}% complete
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default InitialLoadingOverlay;
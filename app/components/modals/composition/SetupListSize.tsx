import { motion } from "framer-motion"

type Props = {
    hierarchyOptions: { value: string; label: string; description: string }[];
    isPredefined: boolean;
    activeHierarchy: string;
    color: { primary: string; secondary: string };
    handleHierarchyChange: (value: string) => void;
}

const SetupListSize = ({hierarchyOptions, isPredefined, activeHierarchy, color, handleHierarchyChange}: Props) => {
    return       <div className="mb-8">
        <label className="block text-sm font-medium text-slate-300 mb-4">
          List Size
        </label>
        <div className="space-y-2">
          {hierarchyOptions.map((option, index) => (
            <motion.button
              key={option.value}
              disabled={isPredefined}
              onClick={() => handleHierarchyChange(option.value)}
              className={`w-full text-left p-4 rounded-xl transition-all duration-300 group ${
                isPredefined ? 'cursor-not-allowed' : 'cursor-pointer'
              }`}
              style={{
                background: activeHierarchy === option.value 
                  ? `linear-gradient(135deg, ${color.primary}40, ${color.secondary}40)`
                  : isPredefined ? 'rgba(51, 65, 85, 0.2)' : 'rgba(51, 65, 85, 0.3)',
                border: activeHierarchy === option.value 
                  ? `2px solid ${color.primary}60`
                  : '2px solid transparent'
              }}
              whileHover={!isPredefined ? { scale: 1.02 } : {}}
              whileTap={!isPredefined ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div 
                    className={`text-lg font-bold mb-1 ${
                      activeHierarchy === option.value 
                        ? 'text-white' 
                        : isPredefined ? 'text-slate-500' : 'text-slate-300'
                    }`}
                  >
                    {option.label}
                  </div>
                  <div 
                    className={`text-sm ${
                      activeHierarchy === option.value 
                        ? 'text-slate-300' 
                        : isPredefined ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {option.description}
                  </div>
                </div>
                
                <motion.div
                  className={`w-4 h-4 rounded-full border-2 ${
                    activeHierarchy === option.value 
                      ? 'border-white' 
                      : isPredefined ? 'border-slate-600' : 'border-slate-400'
                  }`}
                  style={{
                    background: activeHierarchy === option.value 
                      ? `linear-gradient(135deg, ${color.primary}, ${color.secondary})`
                      : 'transparent'
                  }}
                  initial={false}
                  animate={{
                    scale: activeHierarchy === option.value ? 1.2 : 1
                  }}
                />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
}

export default SetupListSize;
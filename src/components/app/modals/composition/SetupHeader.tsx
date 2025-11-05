import { motion, AnimatePresence } from "framer-motion";
import { Edit3, Lock } from "lucide-react";

type Props = {
    color: {
        primary: string;
        secondary: string;
        accent: string;
    };
    isPredefined: boolean;
    setIsPredefined: (predefined: boolean) => void;
}

const SetupHeader = ({color, isPredefined, setIsPredefined}: Props) => {
    return <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-200 flex items-center gap-2">
            <div
                className="w-2 h-2 rounded-full"
                style={{ background: color.accent }}
            />
            Configuration
        </h3>

        <AnimatePresence mode="wait">
            {isPredefined ? (
                <motion.button
                    key="customize"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setIsPredefined(false)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105"
                    style={{
                        background: `linear-gradient(135deg, ${color.primary}60, ${color.secondary}60)`,
                        color: 'white'
                    }}
                >
                    <Edit3 className="w-3 h-3" />
                    Customize
                </motion.button>
            ) : (
                <motion.div
                    key="locked"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-400"
                >
                    <Lock className="w-3 h-3" />
                    Custom Mode
                </motion.div>
            )}
        </AnimatePresence>
    </div>
}

export default SetupHeader;
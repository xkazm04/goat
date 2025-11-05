import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { BacklogGroups } from "../../Backlog/BacklogGroups";

type Props = {
    toggleMobileSidebar: () => void;
}

const MatchContainerMobile = ({toggleMobileSidebar}: Props) => {
    return <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 2xl:hidden"
        onClick={toggleMobileSidebar}
    >
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
            }}
            className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="h-full flex flex-col">
                {/* Mobile Header */}
                <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Collection</h2>
                    <button
                        onClick={toggleMobileSidebar}
                        className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Mobile Content */}
                <div className="flex-1 overflow-hidden">
                    <BacklogGroups />
                </div>
            </div>
        </motion.div>
    </motion.div>
}

export default MatchContainerMobile;
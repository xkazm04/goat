import { MatchGrid } from "./MatchGrid";
import { BacklogGroups } from "./BacklogGroups";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useState } from "react";
import { Target, Keyboard, Zap, ChevronLeft, ChevronRight, Archive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BacklogItem } from "./BacklogItem";

type Props = {
    setActiveItem: (id: string) => void;
    handleDragEnd: (event: DragEndEvent) => void;
    selectedBacklogItem: string | null;
    backlogGroups: any[];
    compareList: any[];
    toggleSidebar: () => void;
    isSidebarCollapsed: boolean;
    setIsComparisonModalOpen: (isOpen: boolean) => void;
};

const MatchContainerContent = ({ setActiveItem, handleDragEnd, selectedBacklogItem, backlogGroups, compareList, toggleSidebar, isSidebarCollapsed, setIsComparisonModalOpen }: Props) => {
    const [isDragging, setIsDragging] = useState(false);
    const [draggedItem, setDraggedItem] = useState<any>(null);

    const handleDragStart = (event: DragStartEvent) => {
        setIsDragging(true);
        const { active } = event;
        setActiveItem(active.id.toString());

        // Find the dragged item
        const item = backlogGroups
            .flatMap(group => group.items)
            .find(item => item.id === active.id);

        setDraggedItem(item);
    };

    const onDragEnd = (event: DragEndEvent) => {
        setIsDragging(false);
        setDraggedItem(null);
        handleDragEnd(event);
    };

    const getSelectedItemName = () => {
        if (!selectedBacklogItem) return null;
        const selectedItem = backlogGroups
            .flatMap(group => group.items)
            .find(item => item.id === selectedBacklogItem);
        return selectedItem?.title;
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor)
    );


    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
        >
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex flex-row justify-between items-center gap-4 mb-2">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-white">
                            G.O.A.T. Ranking
                        </h1>
                        <p className="text-lg text-yellow-100">
                            Build your ultimate top 50 greatest of all time
                        </p>
                    </div>

                    {/* Center - VS Button */}
                    <div className="flex justify-center">
                        <motion.button
                            onClick={() => setIsComparisonModalOpen(true)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white transition-all duration-300"
                            style={{
                                background: `linear-gradient(135deg, 
                        rgba(59, 130, 246, 0.8) 0%,
                        rgba(147, 51, 234, 0.8) 100%
                      )`,
                                boxShadow: compareList.length > 0
                                    ? '0 4px 15px rgba(59, 130, 246, 0.3)'
                                    : 'none'
                            }}
                        >
                            <Zap className="w-5 h-5" />
                            <span className="text-lg">VS</span>
                            {compareList.length > 0 && (
                                <div className="w-6 h-6 rounded-full bg-white text-blue-600 text-xs font-bold flex items-center justify-center">
                                    {compareList.length}
                                </div>
                            )}
                        </motion.button>
                    </div>

                    {/* Instructions */}
                    <div className="flex flex-col gap-2">
                        <div
                            className="flex items-center text-gray-400 gap-2 text-sm px-4 py-2 rounded-lg w-fit"
                            style={{
                                background: 'rgba(30, 41, 59, 0.5)',
                                border: '1px solid rgba(71, 85, 105, 0.3)'
                            }}
                        >
                            <Target className="w-4 h-4" />
                            <span>Drag items to the ranking grid or select and click to match</span>
                        </div>

                        {selectedBacklogItem && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center text-blue-300 gap-2 text-sm px-4 py-2 rounded-lg w-fit"
                                style={{
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)'
                                }}
                            >
                                <Keyboard className="w-4 h-4" />
                                <span>
                                    Press <strong>1-9</strong> or <strong>0</strong> to assign "{getSelectedItemName()}" to positions 1-10
                                </span>
                            </motion.div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Content Area */}
            <div className="flex gap-6">
                {/* Main Grid Area - Full Width on XL+ */}
                <motion.div
                    className="flex-1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    layout
                >
                    <MatchGrid isDragging={isDragging} />
                </motion.div>

                {/* Mobile/Tablet Sidebar (XL- screens) */}
                <div className="xl:hidden">
                    {/* Sidebar Toggle Button for smaller screens */}
                    <motion.button
                        onClick={toggleSidebar}
                        className="self-start mt-16 p-3 rounded-xl transition-all duration-300 group z-10"
                        style={{
                            background: `linear-gradient(135deg, 
                      rgba(30, 41, 59, 0.8) 0%,
                      rgba(51, 65, 85, 0.9) 100%
                    )`,
                            border: '1px solid rgba(71, 85, 105, 0.4)',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={isSidebarCollapsed ? 'Show Collection' : 'Hide Collection'}
                    >
                        <div className="flex items-center gap-2">
                            {isSidebarCollapsed ? (
                                <>
                                    <Archive className="w-5 h-5 text-slate-300 group-hover:text-white transition-colors" />
                                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                                </>
                            ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                        </div>
                    </motion.button>

                    {/* Collapsible Sidebar for smaller screens */}
                    <AnimatePresence>
                        {!isSidebarCollapsed && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 384, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 30,
                                    opacity: { duration: 0.2 }
                                }}
                                className="overflow-hidden"
                            >
                                <motion.div
                                    initial={{ x: 50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 50, opacity: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="w-96"
                                >
                                    <BacklogGroups />
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay dropAnimation={null}>
                {draggedItem ? (
                    <div
                        className="transform rotate-3 scale-110"
                        style={{
                            filter: 'drop-shadow(0 25px 25px rgba(0, 0, 0, 0.5))'
                        }}
                    >
                        <BacklogItem
                            item={draggedItem}
                            isDragOverlay={true}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

export default MatchContainerContent;
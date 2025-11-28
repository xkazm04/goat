"use client";

import { useState, useCallback, useEffect } from "react";
import { DndContext, DragOverlay, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { useTopLists } from "@/hooks/use-top-lists";
import { AwardItem } from "./components/AwardItem";
import { SimpleCollectionPanel } from "../Match/sub_MatchCollections/SimpleCollectionPanel";
import { DragOverlayContent, CursorGlow } from "../Match/sub_MatchGrid/components/DragComponents";
import { useMotionValue, useSpring, motion } from "framer-motion";
import { BacklogItem } from "@/types/backlog-groups";
import { GridItemType } from "@/types/match";
import { CollectionItem } from "../Collection/types";
import { backlogGroupsToCollectionGroups } from "../Collection";
import { useBacklogStore } from "@/stores/backlog-store";
import { Loader2, Trophy, Sparkles, Star } from "lucide-react";

interface AwardListProps {
    parentListId: string;
    title?: string;
    description?: string;
}

interface AwardCandidate {
    id: string;
    title: string;
    image_url?: string | null;
}

export function AwardList({ parentListId, title = "Annual Awards", description }: AwardListProps) {
    // Fetch award categories (child lists)
    const { data: awardLists, isLoading } = useTopLists({
        parent_list_id: parentListId,
        type: 'award',
        limit: 50
    });

    // Local state for winners (map of listId -> GridItemType)
    const [winners, setWinners] = useState<Record<string, GridItemType>>({});
    
    // Local state for candidates per award (map of listId -> AwardCandidate[])
    const [candidatesByAward, setCandidatesByAward] = useState<Record<string, AwardCandidate[]>>({});

    // Drag state
    const [activeItem, setActiveItem] = useState<CollectionItem | GridItemType | null>(null);
    const [activeType, setActiveType] = useState<'collection' | 'grid' | null>(null);

    // Stores
    const groups = useBacklogStore(state => state.groups);
    const markItemAsUsed = useBacklogStore(state => state.markItemAsUsed);

    // Initialize winners and candidates from fetched lists
    useEffect(() => {
        if (awardLists) {
            const initialWinners: Record<string, GridItemType> = {};
            const initialCandidates: Record<string, AwardCandidate[]> = {};
            
            awardLists.forEach(list => {
                // Initialize empty candidates array for each award
                initialCandidates[list.id] = [];
                
                if (list.items && list.items.length > 0) {
                    // First item is the winner
                    const winner = list.items[0];
                    initialWinners[list.id] = {
                        id: winner.id,
                        title: winner.title,
                        description: winner.description || '',
                        image_url: winner.image_url,
                        position: 0,
                        matched: true,
                        isDragPlaceholder: false,
                        tags: []
                    };
                    
                    // Remaining items (up to 5) are candidates
                    initialCandidates[list.id] = list.items.slice(1, 6).map(item => ({
                        id: item.id,
                        title: item.title,
                        image_url: item.image_url
                    }));
                }
            });
            
            setWinners(prev => ({ ...prev, ...initialWinners }));
            setCandidatesByAward(prev => ({ ...prev, ...initialCandidates }));
        }
    }, [awardLists]);

    // Cursor glow
    const cursorX = useMotionValue(0);
    const cursorY = useMotionValue(0);
    const glowX = useSpring(cursorX, { damping: 20, stiffness: 200 });
    const glowY = useSpring(cursorY, { damping: 20, stiffness: 200 });

    useEffect(() => {
        if (!activeItem) return;
        const handleMouseMove = (e: MouseEvent) => {
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [activeItem, cursorX, cursorY]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 3,
            },
        })
    );

    const handleDragStart = (event: any) => {
        const { active } = event;
        const itemData = active.data.current;

        if (itemData?.type === 'collection-item') {
            setActiveItem(itemData.item);
            setActiveType('collection');
        } else if (itemData?.type === 'grid-item') {
            setActiveItem(itemData.item);
            setActiveType('grid');
        }
    };

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveItem(null);
        setActiveType(null);

        if (!over) return;

        const itemData = active.data.current;
        const dropId = String(over.id);
        const dropData = over.data.current;

        if (!itemData) return;

        const item = itemData.item as BacklogItem | GridItemType;
        const itemTitle = 'title' in item ? item.title : (item as BacklogItem).name || '';

        // Check if dropped on an award winner slot
        if (dropId.startsWith('award-')) {
            const targetListId = dropId.replace('award-', '');

            const newWinner: GridItemType = {
                id: `winner-${targetListId}-${Date.now()}`,
                title: itemTitle,
                description: item.description || '',
                image_url: item.image_url,
                position: 0,
                matched: true,
                isDragPlaceholder: false,
                tags: item.tags || []
            };

            setWinners(prev => ({ ...prev, [targetListId]: newWinner }));

            console.log(`🏆 Awarding "${itemTitle}" to category`);

            if ('id' in item) {
                markItemAsUsed(item.id, true);
            }
        }
        // Check if dropped on a candidate slot
        else if (dropId.startsWith('candidate-')) {
            const parts = dropId.split('-');
            const listId = parts[1];
            const slotIndex = parseInt(parts[2], 10);

            const newCandidate: AwardCandidate = {
                id: `candidate-${listId}-${Date.now()}`,
                title: itemTitle,
                image_url: item.image_url
            };

            setCandidatesByAward(prev => {
                const currentCandidates = [...(prev[listId] || [])];
                // Pad array if needed
                while (currentCandidates.length <= slotIndex) {
                    currentCandidates.push({ id: `empty-${currentCandidates.length}`, title: '', image_url: null });
                }
                currentCandidates[slotIndex] = newCandidate;
                return { ...prev, [listId]: currentCandidates };
            });

            console.log(`📋 Added "${itemTitle}" as candidate #${slotIndex + 1}`);

            if ('id' in item) {
                markItemAsUsed(item.id, true);
            }
        }
    }, [markItemAsUsed]);

    const handleRemoveWinner = useCallback((listId: string) => {
        setWinners(prev => {
            const next = { ...prev };
            delete next[listId];
            return next;
        });
    }, []);

    const getItemTitle = (item: any) => item.title || item.name || '';

    // Calculate stats
    const totalAwards = awardLists?.length || 0;
    const awardedCount = Object.keys(winners).length;
    const totalCandidates = Object.values(candidatesByAward).reduce(
        (sum, candidates) => sum + candidates.filter(c => c.title).length, 
        0
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="relative">
                        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
                        <Trophy className="w-6 h-6 text-yellow-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-gray-400 text-sm">Loading awards...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="min-h-screen bg-[#050505] pb-80 relative overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900/15 via-[#050505] to-[#050505]" />
                    
                    {/* Floating orbs */}
                    <motion.div
                        animate={{ 
                            x: [0, 100, 0],
                            y: [0, -50, 0],
                            opacity: [0.08, 0.15, 0.08]
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute top-20 left-1/4 w-96 h-96 bg-yellow-500/20 rounded-full blur-3xl"
                    />
                    <motion.div
                        animate={{ 
                            x: [0, -80, 0],
                            y: [0, 30, 0],
                            opacity: [0.05, 0.12, 0.05]
                        }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="absolute top-40 right-1/4 w-64 h-64 bg-orange-500/15 rounded-full blur-3xl"
                    />

                    {/* Star particles */}
                    {[...Array(15)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ 
                                opacity: [0, 0.4, 0],
                                scale: [0.5, 1, 0.5]
                            }}
                            transition={{ 
                                duration: 3 + Math.random() * 2,
                                repeat: Infinity,
                                delay: Math.random() * 5
                            }}
                            className="absolute"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 50}%`,
                            }}
                        >
                            <Star className="w-2 h-2 text-yellow-500/40" />
                        </motion.div>
                    ))}
                </div>

                <div className="max-w-5xl mx-auto px-6 py-8 relative z-10">
                    
                    {/* Header Section */}
                    <motion.header 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-8"
                    >
                        {/* Trophy Icon */}
                        <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                            className="inline-flex items-center justify-center mb-4"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full" />
                                <div className="relative p-3 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 rounded-xl border border-yellow-500/30">
                                    <Trophy className="w-8 h-8 text-yellow-500" />
                                </div>
                                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-pulse" />
                            </div>
                        </motion.div>

                        {/* Title */}
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-400 mb-2"
                        >
                            {title}
                        </motion.h1>

                        {/* Description */}
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-gray-400 max-w-lg mx-auto text-sm mb-4"
                        >
                            {description || "Drag items from your collection to nominate candidates, then crown the winner!"}
                        </motion.p>

                        {/* Stats bar */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex items-center justify-center gap-4 text-xs"
                        >
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/60 rounded-full border border-white/5">
                                <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                                <span className="text-gray-400">{totalAwards} Categories</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/60 rounded-full border border-white/5">
                                <Sparkles className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-gray-400">{awardedCount} Awarded</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/60 rounded-full border border-white/5">
                                <Star className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-gray-400">{totalCandidates} Nominees</span>
                            </div>
                        </motion.div>
                    </motion.header>

                    {/* Divider */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
                    </div>

                    {/* Award Categories List */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="space-y-4"
                    >
                        {awardLists?.map((list, index) => (
                            <AwardItem
                                key={list.id}
                                list={list}
                                gridItem={winners[list.id] || null}
                                candidates={candidatesByAward[list.id] || []}
                                onRemove={() => handleRemoveWinner(list.id)}
                                getItemTitle={getItemTitle}
                                index={index}
                            />
                        ))}

                        {(!awardLists || awardLists.length === 0) && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-16"
                            >
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800/50 mb-4">
                                    <Trophy className="w-10 h-10 text-gray-600" />
                                </div>
                                <p className="text-gray-500 text-lg mb-2">No award categories yet</p>
                                <p className="text-gray-600 text-sm">Create categories to start nominating and awarding</p>
                            </motion.div>
                        )}
                    </motion.div>
                </div>

                <SimpleCollectionPanel groups={backlogGroupsToCollectionGroups(groups)} />
            </div>

            <DragOverlay modifiers={[snapCenterToCursor]}>
                {activeItem && <DragOverlayContent activeItem={activeItem} />}
            </DragOverlay>

            {activeItem && <CursorGlow glowX={glowX} glowY={glowY} cursorX={cursorX} cursorY={cursorY} />}
        </DndContext>
    );
}

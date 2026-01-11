"use client";

import { useState, useCallback, useEffect, createContext, useContext } from "react";
import { DndContext, DragOverlay, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useTopLists } from "@/hooks/use-top-lists";
import { AwardItem } from "./components/AwardItem";
import { SimpleCollectionPanel } from "../Match/sub_MatchCollections/SimpleCollectionPanel";
import { DragOverlayContent } from "../Match/sub_MatchGrid/components/DragComponents";
import { motion } from "framer-motion";
import { BacklogItem } from "@/types/backlog-groups";
import { GridItemType } from "@/types/match";
import { CollectionItem } from "../Collection/types";
import { backlogGroupsToCollectionGroups } from "../Collection";
import { useBacklogStore } from "@/stores/backlog-store";
import { Loader2, Trophy, Sparkles, Star, MousePointer2 } from "lucide-react";

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

// Context for click-to-assign functionality
interface ClickAssignContextType {
    selectedItem: CollectionItem | null;
    setSelectedItem: (item: CollectionItem | null) => void;
    assignToAward: (listId: string) => void;
    assignToCandidate: (listId: string, slotIndex: number) => void;
}

const ClickAssignContext = createContext<ClickAssignContextType | null>(null);

export function useClickAssign() {
    const context = useContext(ClickAssignContext);
    return context;
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

    // Click-to-assign state
    const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);

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

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = (event: any) => {
        const { active } = event;
        const itemData = active.data.current;

        if (itemData?.type === 'collection-item') {
            setActiveItem(itemData.item);
            // Clear click selection when starting drag
            setSelectedItem(null);
        } else if (itemData?.type === 'grid-item') {
            setActiveItem(itemData.item);
        }
    };

    // Shared function to assign an item to a winner slot
    const assignWinner = useCallback((item: CollectionItem | BacklogItem | GridItemType, targetListId: string) => {
        const itemTitle = 'title' in item ? item.title : (item as BacklogItem).name || '';

        const newWinner: GridItemType = {
            id: `winner-${targetListId}-${Date.now()}`,
            title: itemTitle,
            description: item.description || '',
            image_url: item.image_url || undefined,
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
    }, [markItemAsUsed]);

    // Shared function to assign an item to a candidate slot
    const assignCandidate = useCallback((item: CollectionItem | BacklogItem | GridItemType, listId: string, slotIndex: number) => {
        const itemTitle = 'title' in item ? item.title : (item as BacklogItem).name || '';

        const newCandidate: AwardCandidate = {
            id: `candidate-${listId}-${Date.now()}`,
            title: itemTitle,
            image_url: item.image_url
        };

        setCandidatesByAward(prev => {
            const currentCandidates = [...(prev[listId] || [])];
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
    }, [markItemAsUsed]);

    // Click-to-assign handlers
    const handleAssignToAward = useCallback((listId: string) => {
        if (selectedItem) {
            assignWinner(selectedItem, listId);
            setSelectedItem(null);
        }
    }, [selectedItem, assignWinner]);

    const handleAssignToCandidate = useCallback((listId: string, slotIndex: number) => {
        if (selectedItem) {
            assignCandidate(selectedItem, listId, slotIndex);
            setSelectedItem(null);
        }
    }, [selectedItem, assignCandidate]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveItem(null);

        if (!over) return;

        const itemData = active.data.current;
        const dropId = String(over.id);

        if (!itemData) return;

        const item = itemData.item as BacklogItem | GridItemType;

        // Check if dropped on an award winner slot
        if (dropId.startsWith('award-')) {
            const targetListId = dropId.replace('award-', '');
            assignWinner(item, targetListId);
        }
        // Check if dropped on a candidate slot
        else if (dropId.startsWith('candidate-')) {
            const parts = dropId.split('-');
            const listId = parts[1];
            const slotIndex = parseInt(parts[2], 10);
            assignCandidate(item, listId, slotIndex);
        }
    }, [assignWinner, assignCandidate]);

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

    // Click-to-assign context value
    const clickAssignValue: ClickAssignContextType = {
        selectedItem,
        setSelectedItem,
        assignToAward: handleAssignToAward,
        assignToCandidate: handleAssignToCandidate,
    };

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
        <ClickAssignContext.Provider value={clickAssignValue}>
            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                {/* Fixed background */}
                <div className="fixed inset-0 bg-[#050505] -z-10" />
                <div className="fixed inset-0 pointer-events-none -z-10">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900/15 via-[#050505] to-[#050505]" />
                    <div
                        className="absolute top-20 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl"
                    />
                    <div
                        className="absolute top-40 right-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"
                    />
                </div>

                {/* Main scrollable content */}
                <div className="min-h-screen pb-[55vh]">
                    <div className="max-w-5xl mx-auto px-6 py-8 relative z-10">

                        {/* Header Section */}
                        <motion.header
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center mb-8"
                        >
                            {/* Trophy Icon */}
                            <div className="inline-flex items-center justify-center mb-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full" />
                                    <div className="relative p-3 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 rounded-xl border border-yellow-500/30">
                                        <Trophy className="w-8 h-8 text-yellow-500" />
                                    </div>
                                    <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-pulse" />
                                </div>
                            </div>

                            {/* Title */}
                            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-orange-400 mb-2">
                                {title}
                            </h1>

                            {/* Description */}
                            <p className="text-gray-400 max-w-lg mx-auto text-sm mb-4">
                                {description || "Click an item to select, then click an award slot. Or drag items directly!"}
                            </p>

                            {/* Stats bar */}
                            <div className="flex items-center justify-center gap-4 text-xs flex-wrap">
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
                            </div>

                            {/* Selected item indicator */}
                            {selectedItem && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 rounded-full border border-cyan-500/40"
                                >
                                    <MousePointer2 className="w-4 h-4 text-cyan-400" />
                                    <span className="text-sm text-cyan-300">
                                        Click on an award slot to assign: <strong>{selectedItem.title}</strong>
                                    </span>
                                    <button
                                        onClick={() => setSelectedItem(null)}
                                        className="ml-2 text-cyan-400 hover:text-white transition-colors"
                                    >
                                        ✕
                                    </button>
                                </motion.div>
                            )}
                        </motion.header>

                        {/* Divider */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
                        </div>

                        {/* Award Categories List */}
                        <div className="space-y-4">
                            {awardLists?.map((list, index) => (
                                <AwardItem
                                    key={list.id}
                                    list={list}
                                    gridItem={winners[list.id] || null}
                                    candidates={candidatesByAward[list.id] || []}
                                    onRemove={() => handleRemoveWinner(list.id)}
                                    getItemTitle={getItemTitle}
                                    index={index}
                                    hasSelectedItem={!!selectedItem}
                                />
                            ))}

                            {(!awardLists || awardLists.length === 0) && (
                                <div className="text-center py-16">
                                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800/50 mb-4">
                                        <Trophy className="w-10 h-10 text-gray-600" />
                                    </div>
                                    <p className="text-gray-500 text-lg mb-2">No award categories yet</p>
                                    <p className="text-gray-600 text-sm">Create categories to start nominating and awarding</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Collection Panel - truly fixed outside everything */}
                <SimpleCollectionPanel
                    groups={backlogGroupsToCollectionGroups(groups)}
                    onItemClick={(item) => setSelectedItem(item)}
                    selectedItemId={selectedItem?.id}
                />

                {/* Simple Drag Overlay without cursor glow effects */}
                <DragOverlay dropAnimation={null}>
                    {activeItem && <DragOverlayContent activeItem={activeItem} />}
                </DragOverlay>
            </DndContext>
        </ClickAssignContext.Provider>
    );
}

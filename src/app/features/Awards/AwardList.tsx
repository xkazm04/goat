"use client";

import { useState, useCallback, useEffect } from "react";
import { DndContext, DragOverlay, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useTopLists } from "@/hooks/use-top-lists";
import { topListsApi } from "@/lib/api/top-lists";
import { AwardItem } from "./components/AwardItem";
import { SimpleCollectionPanel } from "../Match/sub_MatchCollections/SimpleCollectionPanel";
import { DragOverlayContent, CursorGlow } from "../Match/sub_MatchGrid/components/DragComponents";
import { useMotionValue, useSpring } from "framer-motion";
import { BacklogItem } from "@/types/backlog-groups";
import { GridItemType } from "@/types/match";
import { CollectionItem } from "../Collection/types";
import { backlogGroupsToCollectionGroups } from "../Collection";
import { useBacklogStore } from "@/stores/backlog-store";
import { Loader2 } from "lucide-react";
import { TopListItem } from "@/types/top-lists";

interface AwardListProps {
    parentListId: string;
}

export function AwardList({ parentListId }: AwardListProps) {
    // Fetch award categories (child lists)
    const { data: awardLists, isLoading } = useTopLists({
        parent_list_id: parentListId,
        type: 'award',
        limit: 50 // Support up to 50 categories
    });

    // Local state for winners (map of listId -> GridItemType)
    const [winners, setWinners] = useState<Record<string, GridItemType>>({});

    // Drag state
    const [activeItem, setActiveItem] = useState<CollectionItem | GridItemType | null>(null);
    const [activeType, setActiveType] = useState<'collection' | 'grid' | null>(null);

    // Stores
    const groups = useBacklogStore(state => state.groups);
    const markItemAsUsed = useBacklogStore(state => state.markItemAsUsed);

    // Initialize winners from fetched lists
    useEffect(() => {
        if (awardLists) {
            const initialWinners: Record<string, GridItemType> = {};
            awardLists.forEach(list => {
                if (list.items && list.items.length > 0) {
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
                }
            });
            setWinners(prev => ({ ...prev, ...initialWinners }));
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

        if (!itemData) return;

        // Check if dropped on an award slot
        if (dropId.startsWith('award-')) {
            const targetListId = dropId.replace('award-', '');
            const item = itemData.item as BacklogItem | GridItemType;

            // Optimistic update
            const newWinner: GridItemType = {
                id: `winner-${targetListId}`,
                title: 'title' in item ? item.title : (item as BacklogItem).name || '',
                description: item.description || '',
                image_url: item.image_url,
                position: 0,
                matched: true,
                isDragPlaceholder: false,
                tags: item.tags || []
            };

            setWinners(prev => ({ ...prev, [targetListId]: newWinner }));

            // Persist to DB
            try {
                console.log(`🏆 Awarding ${newWinner.title} to list ${targetListId}`);
                // TODO: Implement actual API call to save winner
            } catch (error) {
                console.error("Failed to save winner", error);
            }

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
        // TODO: API call to remove item
    }, []);

    const getItemTitle = (item: any) => item.title || item.name || '';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="min-h-screen bg-[#050505] pb-72 relative overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-900/10 via-[#050505] to-[#050505]" />
                </div>

                <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">
                    <div className="space-y-4">
                        {awardLists?.map(list => (
                            <AwardItem
                                key={list.id}
                                list={list}
                                gridItem={winners[list.id] || null}
                                onRemove={() => handleRemoveWinner(list.id)}
                                getItemTitle={getItemTitle}
                            />
                        ))}

                        {(!awardLists || awardLists.length === 0) && (
                            <div className="text-center text-gray-500 py-12">
                                No award categories found for this list.
                            </div>
                        )}
                    </div>
                </div>

                <SimpleCollectionPanel groups={backlogGroupsToCollectionGroups(groups)} />
            </div>

            <DragOverlay>
                {activeItem && <DragOverlayContent activeItem={activeItem} />}
            </DragOverlay>

            {activeItem && <CursorGlow glowX={glowX} glowY={glowY} />}
        </DndContext>
    );
}

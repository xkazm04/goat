"use client";

import { useDraggable } from "@dnd-kit/core";
import { ItemCard } from "@/components/ui/item-card";
import { CollectionItem } from "./types";
import { useProgressiveWikiImage } from "@/hooks/use-progressive-wiki-image";
import { ConsensusOverlay } from "@/app/features/Match/sub_MatchCollections/components/ConsensusOverlay";
import { RankBadge } from "@/app/features/Match/sub_MatchCollections/components/RankBadge";
import { useConsensusStore } from "@/stores/consensus-store";

interface SimpleCollectionItemProps {
  item: CollectionItem;
  groupId: string;
  /** Index of the item in the grid for staggered animations */
  itemIndex?: number;
}

/**
 * Minimal draggable item with consensus ranking overlay
 * Shows global ranking consensus data based on view mode:
 * - Median rank across all users
 * - Volatility (how contested the item is)
 * - Peer cluster indicators
 * - Consensus badges
 */
export function SimpleCollectionItem({ item, groupId, itemIndex = 0 }: SimpleCollectionItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: {
      type: 'collection-item',
      item,
      groupId
    }
  });

  const viewMode = useConsensusStore((state) => state.viewMode);
  const showConsensus = viewMode !== 'off';

  // Progressive image loading with wiki fallback
  const {
    imageUrl: currentImageUrl,
    isFetching: isLoadingWiki,
  } = useProgressiveWikiImage({

    itemTitle: item.title,
    existingImage: item.image_url,
    autoFetch: true,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative"
      data-testid={`simple-collection-item-wrapper-${item.id}`}
    >
      <ItemCard
        title={item.title}
        image={currentImageUrl}
        layout="grid"
        interactive="draggable"
        state={isDragging ? "dragging" : "default"}
        animated={false}
        progressive={true}
        ariaLabel={`Draggable item: ${item.title}`}
        ariaDescription={item.description}
        testId={`simple-collection-item-${item.id}`}
        hoverEffect="subtle"
        focusRing={false}
        loading={isLoadingWiki}
      />
      {/* Rank badge with micro-animation */}
      {!isDragging && item.ranking !== undefined && (
        <RankBadge
          ranking={item.ranking}
          format="stars"
          animationIndex={itemIndex}
          itemId={item.id}
        />
      )}
      {/* Consensus ranking overlay */}
      {showConsensus && !isDragging && (
        <ConsensusOverlay itemId={item.id} />
      )}
    </div>
  );
}

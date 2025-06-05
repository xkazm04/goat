import { useDroppable } from "@dnd-kit/core";

type Props = {
  position: number;
  size?: 'small' | 'medium' | 'large';
  children?: React.ReactNode;
  isDraggingBacklogItem: boolean;
  selectedBacklogItem: string | null;
  canAddAtPosition: (position: number) => boolean; // Function type
}

const MatchDroppable = ({ 
  position, 
  size = 'medium',
  children,
  isDraggingBacklogItem,
  selectedBacklogItem,
  canAddAtPosition
}: Props) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `grid-${position}`,
  });

  const canAdd = canAddAtPosition(position);
  const isHoveringWithDrag = isOver && isDraggingBacklogItem && canAdd;
  
  return (
    <div
      ref={setNodeRef}
      className={`w-full h-full transition-all duration-300 ${
        isHoveringWithDrag ? 'scale-110 z-30' : isOver && canAdd ? 'scale-105 z-20' : ''
      }`}
      style={{
        filter: isHoveringWithDrag ? 'drop-shadow(0 12px 30px rgba(59, 130, 246, 0.6))' : 'none'
      }}
    >
      {/* Enhanced hover overlay for drag feedback */}
      {isHoveringWithDrag && (
        <div 
          className="absolute inset-0 rounded-xl border-3 border-blue-400 bg-blue-400/25 z-10 pointer-events-none animate-pulse"
          style={{
            boxShadow: '0 0 25px rgba(59, 130, 246, 0.6)'
          }}
        />
      )}
      {children}
    </div>
  );
};

export default MatchDroppable;
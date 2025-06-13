import { Gamepad2, Star, Trophy } from "lucide-react";
import { BacklogItemType } from "@/app/types/match";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

interface BacklogItemContentProps {
  item: BacklogItemType;
  size?: 'small' | 'medium' | 'large';
  isEffectivelyMatched?: boolean;
  isSelected?: boolean;
  isInCompareList?: boolean;
  isDragOverlay?: boolean;
  isDragging?: boolean;
}

export const BacklogItemContent = ({
  item,
  size = 'medium',
  isEffectivelyMatched = false,
  isSelected = false,
  isInCompareList = false,
  isDragOverlay = false,
  isDragging = false
}: BacklogItemContentProps) => {
  // Track image loading errors
  const [imageError, setImageError] = useState(false);

  // Size-dependent styling
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'px-3 py-2',
          icon: 'w-4 h-4',
          title: 'text-xs',
          description: 'text-[10px] max-h-8',
          tag: 'px-1 py-0.5 text-[9px]',
          tagContainer: 'mt-1 gap-1 max-h-5',
          badge: 'w-2 h-2 right-1 top-1',
          avatarSize: 'w-6 h-6 mr-1.5'
        };
      case 'large':
        return {
          container: 'p-4',
          icon: 'w-6 h-6',
          title: 'text-base',
          description: 'text-xs max-h-20',
          tag: 'px-2 py-1 text-xs',
          tagContainer: 'mt-3 gap-2 max-h-14',
          badge: 'w-3 h-3 right-2 top-2',
          avatarSize: 'w-12 h-12 mr-3'
        };
      default: // medium
        return {
          container: 'p-3',
          icon: 'w-5 h-5',
          title: 'text-sm',
          description: 'text-xs max-h-12',
          tag: 'px-1.5 py-0.5 text-[10px]',
          tagContainer: 'mt-2 gap-1.5 max-h-10',
          badge: 'w-2.5 h-2.5 right-1.5 top-1.5',
          avatarSize: 'w-9 h-9 mr-2'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  // Generate icon based on item properties
  const getItemIcon = () => {
    const title = item.title?.toLowerCase() || '';
    
    if (title.includes('game') || title.includes('gta') || title.includes('mario')) {
      return <Gamepad2 className={`${sizeClasses.icon} text-indigo-300`} />;
    }
    
    if (title.includes('jordan') || title.includes('lebron') || title.includes('sport')) {
      return <Trophy className={`${sizeClasses.icon} text-amber-300`} />;
    }
    
    return <Star className={`${sizeClasses.icon} text-blue-300`} />;
  };

  // Debug image URL - add in development mode only
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && !item.image_url) {
      console.log(`ℹ️ Item ${item.id} (${item.title}) has no image_url`);
    }
  }, [item.id, item.title, item.image_url]);

  // Log item data for debugging
  if (process.env.NODE_ENV === 'development' && item.image_url) {
    console.log(`🖼️ Item ${item.id} has image_url: ${item.image_url}`);
  }

  return (
    <div className={`
      relative flex items-start
      ${sizeClasses.container}
      ${isDragOverlay ? 'pointer-events-none' : ''}
    `}>
      {/* Avatar with image support */}
      <div className={`
        ${sizeClasses.avatarSize} rounded-md flex-shrink-0 relative
        bg-gradient-to-br from-indigo-900 to-purple-600
        overflow-hidden flex items-center justify-center
      `}>
        {item.image_url && !imageError ? (
          <Image 
            src={item.image_url}
            alt={item.title || ''}
            fill
            className="object-cover"
            sizes={`(max-width: 768px) 24px, 32px`}
            onError={(e) => {
              console.error(`❌ Failed to load image: ${item.image_url} for item ${item.id}`);
              setImageError(true);
            }}
          />
        ) : (
          getItemIcon()
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 relative">
        {/* Title */}
        <h3 
          className={`${sizeClasses.title} font-medium text-slate-200 truncate max-w-full pr-1`}
          title={item.title}
        >
          {item.title}
        </h3>

        {/* Description */}
        {item.description && (
          <div 
            className={`
              ${sizeClasses.description} text-slate-400 overflow-hidden
              line-clamp-2
            `}
            title={item.description}
          >
            {item.description}
          </div>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className={`
            flex flex-wrap overflow-hidden
            ${sizeClasses.tagContainer}
          `}>
            {item.tags.slice(0, size === 'small' ? 2 : (size === 'medium' ? 3 : 5)).map((tag, index) => (
              <span 
                key={index}
                className={`
                  rounded-full bg-slate-700 inline-block
                  ${sizeClasses.tag} whitespace-nowrap truncate max-w-20
                  ${isEffectivelyMatched ? 'text-slate-400' : 'text-slate-300'}
                `}
                title={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* In comparison badge */}
      {isInCompareList && (
        <motion.div 
          className={`absolute rounded-full bg-blue-500 ${sizeClasses.badge}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </div>
  );
};
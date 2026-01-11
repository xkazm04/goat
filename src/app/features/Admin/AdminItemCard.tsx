"use client";

import { useState } from 'react';
import { ItemCard } from '@/components/ui/item-card';
import { Edit, Save, X, Sparkles, Loader2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { toast } from '@/hooks/use-toast';
import { AdminItem, AISearchMetadata } from './types';

interface AdminItemCardProps {
  item: AdminItem;
  onUpdate: () => void;
}

/**
 * AdminItemCard - Item card with admin actions
 * Wraps the reusable ItemCard component with edit functionality and context menu
 */
export function AdminItemCard({ item, onUpdate }: AdminItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSave = async (url?: string) => {
    const urlToSave = url || imageUrl;
    if (!urlToSave.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/top/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: urlToSave.trim() })
      });

      if (!response.ok) throw new Error('Failed to update item');

      setIsEditing(false);
      setImageUrl('');
      onUpdate();
    } catch (error) {
      console.error('Failed to save image URL:', error);
      alert('Failed to save image URL. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Save item with all AI-discovered metadata in a single request
   */
  const handleSaveWithMetadata = async (metadata: AISearchMetadata): Promise<{ updatedFields: string[] }> => {
    const updatePayload: Record<string, string | number> = {};
    const updatedFields: string[] = [];

    // Build payload with non-null values
    if (metadata.image_url) {
      updatePayload.image_url = metadata.image_url;
      updatedFields.push('image');
    }
    if (metadata.description) {
      updatePayload.description = metadata.description;
      updatedFields.push('description');
    }
    if (metadata.reference_url) {
      updatePayload.reference_url = metadata.reference_url;
      updatedFields.push('reference URL');
    }
    if (metadata.item_year) {
      updatePayload.item_year = metadata.item_year;
      updatedFields.push('year');
    }
    if (metadata.item_year_to) {
      updatePayload.item_year_to = metadata.item_year_to;
      updatedFields.push('end year');
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new Error('No metadata to save');
    }

    const response = await fetch(`/api/top/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });

    if (!response.ok) throw new Error('Failed to update item');

    return { updatedFields };
  };

  const handleCancel = () => {
    setIsEditing(false);
    setImageUrl('');
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const searchWithGemini = async () => {
    setIsSearching(true);
    try {
      const response = await fetch('/api/admin/search-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: item.name,
          category: item.category,
          subcategory: item.subcategory
        })
      });

      const data = await response.json();

      if (data.success && data.image_url) {
        // Save all returned metadata in a single request
        const { updatedFields } = await handleSaveWithMetadata({
          image_url: data.image_url,
          description: data.description,
          reference_url: data.reference_url,
          item_year: data.item_year,
          item_year_to: data.item_year_to
        });

        // Show toast summarizing what was updated
        toast({
          title: `Updated ${item.name}`,
          description: `Saved: ${updatedFields.join(', ')}`
        });

        onUpdate();
      } else {
        alert('No image found. Try editing manually or searching the web.');
      }
    } catch (error) {
      console.error('Failed to search for image:', error);
      alert('Failed to search for image. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const contextMenuItems: ContextMenuItem[] = [
    {
      label: 'Search Wikimedia (AI)',
      icon: Sparkles,
      onClick: searchWithGemini,
      loading: isSearching,
      disabled: isSearching
    },
    {
      label: 'Manual Entry',
      icon: Edit,
      onClick: () => setIsEditing(true),
      disabled: isSearching
    },
    {
      label: 'Open in Google',
      icon: Globe,
      onClick: () => {
        const query = encodeURIComponent(`${item.name} ${item.category}`);
        window.open(`https://www.google.com/search?q=${query}&tbm=isch`, '_blank');
      },
      disabled: isSearching
    }
  ];

  return (
    <div className="relative" onContextMenu={handleContextMenu}>
      <ItemCard
        title={item.name}
        image={item.image_url}
        subtitle={item.group || item.category}
        layout="grid"
        interactive="static"
        showOverlay={!item.image_url}
        overlayContent={
          !item.image_url ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              {isSearching ? (
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              ) : (
                <span className="text-gray-400 text-xs">No Image</span>
              )}
            </div>
          ) : undefined
        }
        actions={
          <div className="absolute top-2 right-2">
            {!isEditing ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(true)}
                disabled={isSearching}
                className="p-1.5 bg-gray-900/90 hover:bg-cyan-600 text-white rounded-md transition-colors backdrop-blur-sm disabled:opacity-50"
                title="Add image URL"
              >
                <Edit className="w-3.5 h-3.5" />
              </motion.button>
            ) : (
              <div className="flex gap-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSave()}
                  disabled={isSaving || !imageUrl.trim()}
                  className="p-1.5 bg-green-600 hover:bg-green-500 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save"
                >
                  <Save className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            )}
          </div>
        }
        actionsPosition="top-right"
        ariaLabel={`Admin item: ${item.name}`}
        testId={`admin-item-${item.id}`}
      />

      {/* Edit Modal Overlay */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-gray-900/95 rounded-lg p-3 flex flex-col justify-center"
          >
            <label htmlFor={`image-url-${item.id}`} className="text-xs text-gray-300 mb-2 font-medium">
              Image URL
            </label>
            <input
              id={`image-url-${item.id}`}
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              autoFocus
              disabled={isSaving}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <div className="mt-2 text-xs text-gray-400">
              Press Enter to save, Esc to cancel, or right-click for options
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu !== null}
        position={contextMenu || { x: 0, y: 0 }}
        items={contextMenuItems}
        onClose={() => setContextMenu(null)}
        triggerId={`admin-item-${item.id}`}
      />
    </div>
  );
}

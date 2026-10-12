"use client";

import { Sparkles, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import {
  GlassModal,
  GlassModalHeader,
  GlassModalBody,
  GlassModalFooter,
  GLASS_INPUT_CLASS,
} from "@/components/ui/glass-modal";
import { toast } from "@/hooks/use-toast";
import { topItemsApi } from "@/lib/api/top-items";
import { useCurrentList } from "@/stores/use-list-store";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  subcategory: string;
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  description?: string;
}

/**
 * Modal for adding new items to the collection
 * Includes AI-powered completion via Gemini
 */
export function AddItemModal({ isOpen, onClose, onSuccess }: AddItemModalProps) {
  const currentList = useCurrentList();
  const category = currentList?.category || '';
  // A new item is filed under the current list's category. Without a list the
  // form cannot submit — and until 2026-09-05 it failed SILENTLY: validation
  // wrote errors.category, nothing rendered it, and the button stayed live.
  const categoryMissing = !category;

  const initialFormData: FormData = { name: '', subcategory: '' };
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const aiRequestInFlight = useRef(false);

  // Reset all form state whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setErrors({});
      setIsSubmitting(false);
      setIsLoadingAI(false);
      aiRequestInFlight.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleInputChange = (field: keyof FormData, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAICompletion = async () => {
    if (!formData.name.trim()) {
      setErrors({ name: 'Please enter a name first' });
      return;
    }

    if (aiRequestInFlight.current) return;
    aiRequestInFlight.current = true;
    setIsLoadingAI(true);
    setErrors({});

    try {
      const response = await fetch('/api/items/enrich', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          category: category,
          subcategory: formData.subcategory || undefined,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to get AI recommendation';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Response body wasn't valid JSON - use default message
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error('Enrichment returned no data');
      }

      const enriched = result.data;

      // Update form with enriched data
      setFormData(prev => ({
        ...prev,
        item_year: enriched.year || prev.item_year,
        item_year_to: enriched.yearEnd || prev.item_year_to,
        image_url: enriched.selectedImage?.url || prev.image_url,
        description: enriched.description || prev.description,
      }));

      const sourceLabel = result.sources?.length
        ? ` from ${result.sources.join(', ')}`
        : '';

      toast({
        title: "AI Completion Successful",
        description: enriched.confidence
          ? `Found information with ${Math.round(enriched.confidence * 100)}% confidence${sourceLabel}`
          : "Information retrieved successfully",
      });
    } catch (error) {
      console.error('Error getting AI recommendation:', error);
      toast({
        title: "AI Completion Failed",
        description: error instanceof Error ? error.message : "Could not retrieve information",
      });
    } finally {
      setIsLoadingAI(false);
      aiRequestInFlight.current = false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!category) {
      newErrors.category = 'Category is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await topItemsApi.createItem({
        name: formData.name.trim(),
        category: category,
        subcategory: formData.subcategory.trim() || undefined,
        item_year: formData.item_year,
        item_year_to: formData.item_year_to,
        image_url: formData.image_url,
        description: formData.description,
      });

      toast({
        title: "Item Created",
        description: `"${formData.name}" has been added to the collection`,
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error creating item:', error);

      let errorMessage = 'Failed to create item';
      if (error.response?.status === 409) {
        errorMessage = 'An item with this name already exists in this category';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Creation Failed",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal open={isOpen} onClose={onClose} size="sm:w-[640px]">
      <GlassModalHeader
        icon={Sparkles}
        title="Add New Item"
        subtitle={category ? `${category} collection` : undefined}
        onClose={onClose}
      />

      <GlassModalBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div>
            <label htmlFor="add-item-name" className="block text-sm font-medium text-slate-300 mb-2">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="add-item-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter item name"
              className={`${GLASS_INPUT_CLASS} ${errors.name ? 'border-red-500' : ''}`}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-red-400 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Category (read-only) */}
          <div>
            <label htmlFor="add-item-category" className="block text-sm font-medium text-slate-300 mb-2">
              Category
            </label>
            <input
              id="add-item-category"
              type="text"
              value={category}
              className={`${GLASS_INPUT_CLASS} opacity-50 cursor-not-allowed ${errors.category ? 'border-red-500' : ''}`}
              disabled
              aria-describedby={categoryMissing ? 'add-item-category-missing' : undefined}
            />
            {categoryMissing ? (
              <p
                id="add-item-category-missing"
                className="text-amber-400 text-xs mt-1"
                data-testid="add-item-category-missing"
              >
                Open a list first — new items are filed under its category.
              </p>
            ) : errors.category ? (
              <p className="text-red-400 text-xs mt-1">{errors.category}</p>
            ) : null}
          </div>

          {/* Subcategory Field */}
          <div>
            <label htmlFor="add-item-subcategory" className="block text-sm font-medium text-slate-300 mb-2">
              Subcategory
            </label>
            <input
              id="add-item-subcategory"
              type="text"
              value={formData.subcategory}
              onChange={(e) => handleInputChange('subcategory', e.target.value)}
              placeholder="Enter subcategory (optional)"
              className={GLASS_INPUT_CLASS}
              disabled={isSubmitting}
            />
          </div>

          {/* AI Completion Button */}
          <div className="flex items-center gap-2 pb-2 border-b border-white/[0.08]">
            <button
              type="button"
              onClick={handleAICompletion}
              disabled={isLoadingAI || isSubmitting || !formData.name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-purple-600 to-brand-muted hover:from-purple-500 hover:to-brand disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-control transition-all text-sm font-medium"
            >
              {isLoadingAI ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Getting AI suggestions...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Complete with AI
                </>
              )}
            </button>
            <span className="text-xs text-slate-500">
              AI will fill in year, image, and description
            </span>
          </div>

          {/* AI-filled fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Item Year */}
            <div>
              <label htmlFor="add-item-year" className="block text-sm font-medium text-slate-300 mb-2">
                Year Created
              </label>
              <input
                id="add-item-year"
                type="number"
                value={formData.item_year || ''}
                onChange={(e) => handleInputChange('item_year', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g., 2020"
                min="1000"
                max={new Date().getFullYear() + 10}
                className={GLASS_INPUT_CLASS}
                disabled={isSubmitting}
              />
            </div>

            {/* Item Year To */}
            <div>
              <label htmlFor="add-item-year-to" className="block text-sm font-medium text-slate-300 mb-2">
                Year To (optional)
              </label>
              <input
                id="add-item-year-to"
                type="number"
                value={formData.item_year_to || ''}
                onChange={(e) => handleInputChange('item_year_to', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g., 2024"
                min="1000"
                max={new Date().getFullYear() + 10}
                className={GLASS_INPUT_CLASS}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label htmlFor="add-item-image-url" className="block text-sm font-medium text-slate-300 mb-2">
              Image URL
            </label>
            <input
              id="add-item-image-url"
              type="url"
              value={formData.image_url || ''}
              onChange={(e) => handleInputChange('image_url', e.target.value)}
              placeholder="https://upload.wikimedia.org/..."
              className={GLASS_INPUT_CLASS}
              disabled={isSubmitting}
            />
            {formData.image_url && (
              <div className="mt-2">
                <Image
                  src={formData.image_url}
                  alt="Preview"
                  width={96}
                  height={96}
                  className="w-24 h-24 object-cover rounded-card border border-white/10"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  unoptimized
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="add-item-description" className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              id="add-item-description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter description (optional)"
              rows={3}
              className={`${GLASS_INPUT_CLASS} resize-none`}
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <GlassModalFooter className="-mx-5 -mb-4 mt-4">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || categoryMissing || !formData.name.trim()}
                data-testid="add-item-submit-btn"
                className="px-6 py-2 bg-linear-to-r from-brand to-blue-500 hover:from-brand-hover hover:to-blue-400 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-control transition-all font-medium flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Item'
                )}
              </button>
            </div>
          </GlassModalFooter>
        </form>
      </GlassModalBody>
    </GlassModal>
  );
}

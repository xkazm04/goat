"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2 } from "lucide-react";
import { useCurrentList } from "@/stores/use-list-store";
import { topItemsApi } from "@/lib/api/top-items";
import { toast } from "@/hooks/use-toast";

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

  const [formData, setFormData] = useState<FormData>({
    name: '',
    subcategory: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    setIsLoadingAI(true);
    setErrors({});

    try {
      const response = await fetch('/api/recommendation', {
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI recommendation');
      }

      const recommendation = await response.json();

      // Update form with AI suggestions
      setFormData(prev => ({
        ...prev,
        item_year: recommendation.item_year || prev.item_year,
        item_year_to: recommendation.item_year_to || prev.item_year_to,
        image_url: recommendation.image_url || prev.image_url,
        description: recommendation.description || prev.description,
      }));

      toast({
        title: "AI Completion Successful",
        description: recommendation.confidence 
          ? `Found information with ${Math.round(recommendation.confidence * 100)}% confidence`
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

      // Reset form
      setFormData({
        name: '',
        subcategory: '',
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                Add New Item
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Create a new item for your {category} collection
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter item name"
                className={`w-full px-4 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-700'
                }`}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Category (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <input
                type="text"
                value={category}
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
                disabled
              />
            </div>

            {/* Subcategory Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subcategory
              </label>
              <input
                type="text"
                value={formData.subcategory}
                onChange={(e) => handleInputChange('subcategory', e.target.value)}
                placeholder="Enter subcategory (optional)"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                disabled={isSubmitting}
              />
            </div>

            {/* AI Completion Button */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
              <button
                type="button"
                onClick={handleAICompletion}
                disabled={isLoadingAI || isSubmitting || !formData.name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all text-sm font-medium"
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
              <span className="text-xs text-gray-500">
                AI will fill in year, image, and description
              </span>
            </div>

            {/* AI-filled fields */}
            <div className="grid grid-cols-2 gap-4">
              {/* Item Year */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Year Created
                </label>
                <input
                  type="number"
                  value={formData.item_year || ''}
                  onChange={(e) => handleInputChange('item_year', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g., 2020"
                  min="1000"
                  max={new Date().getFullYear() + 10}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  disabled={isSubmitting}
                />
              </div>

              {/* Item Year To */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Year To (optional)
                </label>
                <input
                  type="number"
                  value={formData.item_year_to || ''}
                  onChange={(e) => handleInputChange('item_year_to', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g., 2024"
                  min="1000"
                  max={new Date().getFullYear() + 10}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Image URL
              </label>
              <input
                type="url"
                value={formData.image_url || ''}
                onChange={(e) => handleInputChange('image_url', e.target.value)}
                placeholder="https://upload.wikimedia.org/..."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                disabled={isSubmitting}
              />
              {formData.image_url && (
                <div className="mt-2">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-lg border border-gray-700"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter description (optional)"
                rows={3}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.name.trim()}
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all font-medium flex items-center gap-2"
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
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}








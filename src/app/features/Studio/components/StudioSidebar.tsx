'use client';

/**
 * StudioSidebar
 * Sidebar for list metadata configuration in the List Creation Studio
 * Placeholder sections for future form inputs
 */

export interface StudioSidebarProps {
  /** Optional children to render instead of placeholders */
  children?: React.ReactNode;
}

/**
 * StudioSidebar Component
 * Provides placeholder sections for list metadata configuration:
 * - List Title (required)
 * - Description (optional)
 * - Category selector
 * - Size selector (Top 10, 20, 50)
 */
export function StudioSidebar({ children }: StudioSidebarProps) {
  if (children) {
    return <aside className="space-y-4">{children}</aside>;
  }

  return (
    <aside className="space-y-4">
      {/* List Title Section */}
      <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-2">
          List Title <span className="text-red-400">*</span>
        </h3>
        <div className="h-10 bg-gray-800/50 rounded animate-pulse" />
      </div>

      {/* Description Section */}
      <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-2">
          Description
        </h3>
        <div className="h-20 bg-gray-800/50 rounded animate-pulse" />
      </div>

      {/* Category Section */}
      <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-2">
          Category
        </h3>
        <div className="h-10 bg-gray-800/50 rounded animate-pulse" />
      </div>

      {/* Size Section */}
      <div className="bg-gray-900/30 border border-gray-800/50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-2">
          List Size
        </h3>
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-gray-800/50 rounded animate-pulse" />
          <div className="flex-1 h-10 bg-gray-800/50 rounded animate-pulse" />
          <div className="flex-1 h-10 bg-gray-800/50 rounded animate-pulse" />
        </div>
      </div>

      {/* Publish Button Placeholder */}
      <div className="pt-4">
        <button
          type="button"
          disabled
          className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-600/50 to-purple-600/50 text-white font-medium opacity-50 cursor-not-allowed"
        >
          Publish List
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Complete all required fields to publish
        </p>
      </div>
    </aside>
  );
}

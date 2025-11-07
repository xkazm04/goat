"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CollectionGroup, CollectionItem } from "@/app/features/Collection/types";
import { SimpleCollectionItem } from "@/app/features/Collection/SimpleCollectionItem";
import { useCurrentList } from "@/stores/use-list-store";
import { useBacklogStore } from "@/stores/backlog-store";

interface SimpleCollectionPanelProps {
  groups: CollectionGroup[];
}

/**
 * Minimal collection panel - just groups and items
 * No fancy animations or complex state
 */
export function SimpleCollectionPanel({ groups }: SimpleCollectionPanelProps) {
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(
    new Set(groups.map(g => g.id))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const currentList = useCurrentList();
  const isLoading = useBacklogStore(state => state.isLoading);
  const loadingGroupIds = useBacklogStore(state => state.loadingGroupIds);
  const loadGroupItems = useBacklogStore(state => state.loadGroupItems);
  const searchGroups = useBacklogStore(state => state.searchGroups);
  const filterGroupsByCategory = useBacklogStore(state => state.filterGroupsByCategory);

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const selectAll = () => setSelectedGroupIds(new Set(groups.map(g => g.id)));
  const deselectAll = () => setSelectedGroupIds(new Set());

  const selectedGroups = groups.filter(g => selectedGroupIds.has(g.id));
  const totalItems = selectedGroups.reduce((sum, g) => sum + (g.items?.length || 0), 0);

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-40 transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : 'translate-y-full'
    }`}>
      {/* Hide/Show Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-4 py-1 rounded-t-lg border border-b-0 border-gray-700 transition-colors flex items-center gap-2 text-xs"
      >
        {isVisible ? (
          <>
            <ChevronDown className="w-3 h-3" />
            Hide Collection
          </>
        ) : (
          <>
            <ChevronUp className="w-3 h-3" />
            Show Collection
          </>
        )}
      </button>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">Collection</h3>
          <span className="text-xs text-gray-400">
            {totalItems} items
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="px-2 py-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex h-64">
        {/* Left: Group Selector */}
        <div className="w-48 border-r border-gray-700 overflow-y-auto">
          <div className="p-2 space-y-1">
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => toggleGroup(group.id)}
                className={`
                  w-full text-left px-3 py-2 rounded text-xs
                  transition-colors
                  ${selectedGroupIds.has(group.id)
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-750'
                  }
                `}
              >
                <div className="font-medium">{group.name}</div>
                <div className="text-[10px] opacity-70">{group.items?.length || 0} items</div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Items Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {selectedGroups.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-gray-500">No groups selected</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedGroups.map(group => (
                <div key={group.id}>
                  {/* Group name */}
                  <div className="mb-2">
                    <h4 className="text-xs font-semibold text-gray-400">{group.name}</h4>
                  </div>
                  
                  {/* Items grid */}
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                    {(group.items || []).map((item: CollectionItem) => (
                      <SimpleCollectionItem
                        key={item.id}
                        item={item}
                        groupId={group.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

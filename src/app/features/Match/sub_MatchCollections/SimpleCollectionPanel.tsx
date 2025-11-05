"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { CollectionGroup } from "./types";
import { SimpleCollectionItem } from "./SimpleCollectionItem";
import { useBacklogStore } from "@/stores/backlog-store";
import { useCurrentList } from "@/stores/use-list-store";

interface SimpleCollectionPanelProps {
  groups: CollectionGroup[];
}

/**
 * Collection panel with full feature set
 * Search, filtering, loading states, expand/collapse
 */
export function SimpleCollectionPanel({ groups }: SimpleCollectionPanelProps) {
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(
    new Set(groups.map(g => g.id))
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Filter groups by search term and current category
  const filteredGroups = useMemo(() => {
    if (!currentList?.category) return [];

    let result = [];

    if (searchTerm?.trim()) {
      // Search and filter by category
      const searchResults = searchGroups(searchTerm);
      result = searchResults.filter(group => {
        const matchesCategory = group.category === currentList.category;
        const matchesSubcategory = !currentList.subcategory || group.subcategory === currentList.subcategory;
        return matchesCategory && matchesSubcategory;
      });
    } else {
      result = filterGroupsByCategory(currentList.category, currentList.subcategory);
    }

    return result;
  }, [currentList?.category, currentList?.subcategory, searchTerm, groups, searchGroups, filterGroupsByCategory]);

  const selectedGroups = filteredGroups.filter(g => selectedGroupIds.has(g.id));
  const totalItems = selectedGroups.reduce((sum, g) => sum + (g.items?.length || g.item_count || 0), 0);

  // Handle hover to load group items
  const handleGroupHover = useCallback(async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group || (group.items && group.items.length > 0)) return; // Already loaded

    if (!loadingGroupIds.has(groupId)) {
      await loadGroupItems(groupId);
    }
  }, [groups, loadingGroupIds, loadGroupItems]);

  const panelHeight = isExpanded ? 'h-[60vh]' : 'h-64';

  return (
    <div className="w-full bg-gray-900 border-t border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">Collection</h3>
          <span className="text-xs text-gray-400">
            {totalItems} items
          </span>
          {isLoading && (
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="pl-7 pr-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 w-32"
            />
          </div>

          <button
            onClick={selectAll}
            className="px-2 py-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            All
          </button>
          <button
            onClick={deselectAll}
            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`flex ${panelHeight} transition-all duration-300`}>
        {/* Left: Group Selector */}
        <div className="w-48 border-r border-gray-700 overflow-y-auto">
          <div className="p-2 space-y-1">
            {filteredGroups.map(group => {
              const isGroupLoading = loadingGroupIds.has(group.id);
              const itemCount = group.items?.length || group.item_count || 0;

              return (
                <button
                  key={group.id}
                  onClick={() => toggleGroup(group.id)}
                  onMouseEnter={() => handleGroupHover(group.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded text-xs
                    transition-colors relative
                    ${selectedGroupIds.has(group.id)
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-750'
                    }
                  `}
                >
                  <div className="font-medium truncate">{group.name}</div>
                  <div className="text-[10px] opacity-70 flex items-center gap-1">
                    {itemCount} items
                    {isGroupLoading && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Items Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {selectedGroups.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-gray-500">
                {searchTerm ? 'No groups found' : 'No groups selected'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedGroups.map(group => {
                const items = group.items || [];
                const isGroupLoading = loadingGroupIds.has(group.id);

                return (
                  <div key={group.id}>
                    {/* Group name */}
                    <div className="mb-2 flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-gray-400">{group.name}</h4>
                      {isGroupLoading && (
                        <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                      )}
                    </div>

                    {/* Items grid or loading state */}
                    {isGroupLoading && items.length === 0 ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                      </div>
                    ) : items.length > 0 ? (
                      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                        {items.map(item => (
                          <SimpleCollectionItem
                            key={item.id}
                            item={item}
                            groupId={group.id}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 py-4">No items in this group</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

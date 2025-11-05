"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Clock, Users, Zap, ChevronRight } from 'lucide-react';
import { useTopLists } from '@/hooks/use-top-lists';
import { useListStore } from '@/stores/use-list-store';
import { useTempUser } from '@/hooks/use-temp-user';
import { useRouter } from 'next/navigation';
import { TopList } from '@/types/top-lists';

interface ListSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ListSelectionModal({ isOpen, onClose }: ListSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const router = useRouter();
  
  const { tempUserId } = useTempUser();
  const { 
    setCurrentList, 
    setAvailableLists, 
    availableLists,
    switchToList 
  } = useListStore();

  // Fetch user's lists
  const { 
    data: userLists = [], 
    isLoading: userListsLoading 
  } = useTopLists({ 
    user_id: tempUserId || undefined,
    limit: 20 
  }, { enabled: !!tempUserId });

  // Fetch predefined lists
  const { 
    data: predefinedLists = [], 
    isLoading: predefinedLoading 
  } = useTopLists({ 
    predefined: true,
    limit: 20 
  });

  // Update available lists when data changes
  useEffect(() => {
    const allLists = [...userLists, ...predefinedLists];
    setAvailableLists(allLists);
  }, [userLists, predefinedLists, setAvailableLists]);

  // Filter lists based on search and category
  const filteredLists = availableLists.filter(list => {
    const matchesSearch = searchQuery === '' || 
      list.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      list.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      list.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Group lists by type
  const userOwnedLists = filteredLists.filter(list => list.user_id === tempUserId);
  const predefinedFilteredLists = filteredLists.filter(list => list.predefined);

  const handleSelectList = async (list: TopList) => {
    try {
      await switchToList(list.id);
      onClose();
      router.push(`/match?list=${list.id}`);
    } catch (error) {
      console.error('Error selecting list:', error);
    }
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'sports', label: 'Sports' },
    { value: 'games', label: 'Games' },
    { value: 'music', label: 'Music' }
  ];

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
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-slate-800 rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Select a List</h2>
              <p className="text-slate-400">Choose an existing list to continue ranking</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search lists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Lists */}
          <div className="space-y-6 overflow-y-auto max-h-96">
            {/* User's Lists */}
            {userOwnedLists.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Your Lists
                </h3>
                <div className="grid gap-3">
                  {userOwnedLists.map(list => (
                    <ListCard 
                      key={list.id} 
                      list={list} 
                      onSelect={handleSelectList}
                      isOwned={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Predefined Lists */}
            {predefinedFilteredLists.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Featured Lists
                </h3>
                <div className="grid gap-3">
                  {predefinedFilteredLists.map(list => (
                    <ListCard 
                      key={list.id} 
                      list={list} 
                      onSelect={handleSelectList}
                      isOwned={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredLists.length === 0 && !userListsLoading && !predefinedLoading && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Lists Found</h3>
                <p className="text-slate-400">Try adjusting your search or create a new list</p>
              </div>
            )}

            {/* Loading State */}
            {(userListsLoading || predefinedLoading) && (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-400">Loading lists...</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface ListCardProps {
  list: TopList;
  onSelect: (list: TopList) => void;
  isOwned: boolean;
}

function ListCard({ list, onSelect, isOwned }: ListCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(list)}
      className="w-full p-4 bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 hover:border-slate-500 transition-all text-left group"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
              {list.title}
            </h4>
            {isOwned && (
              <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                Yours
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="capitalize">{list.category}</span>
            {list.subcategory && (
              <>
                <span>•</span>
                <span className="capitalize">{list.subcategory}</span>
              </>
            )}
            <span>•</span>
            <span>Top {list.size}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(list.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
      </div>
    </motion.button>
  );
}
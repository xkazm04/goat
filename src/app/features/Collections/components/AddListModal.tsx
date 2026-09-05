"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Search, Check, ListPlus, Loader2 } from "lucide-react";
import { memo, useState, useCallback, useMemo } from "react";

import { useReducedMotion } from "@/hooks/use-reduced-motion";

import type { TopList } from "@/types/top-lists";

interface AddListModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Lists the user owns that are NOT already in the collection. */
  candidateLists: TopList[];
  /** Add the chosen lists to the collection. */
  onAdd: (listIds: string[]) => Promise<void> | void;
  isPending?: boolean;
}

export const AddListModal = memo(function AddListModal({
  isOpen,
  onClose,
  candidateLists,
  onAdd,
  isPending = false,
}: AddListModalProps) {
  const reducedMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidateLists;
    return candidateLists.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q)
    );
  }, [candidateLists, search]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Reset transient state whenever the modal is dismissed so the next open
  // starts clean (otherwise stale search/selection leaks across sessions).
  const handleClose = useCallback(() => {
    setSearch("");
    setSelected(new Set());
    onClose();
  }, [onClose]);

  const handleAdd = useCallback(async () => {
    if (selected.size === 0) return;
    await onAdd(Array.from(selected));
    setSearch("");
    setSelected(new Set());
    onClose();
  }, [selected, onAdd, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-modal"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-modal"
          >
            <div className="bg-slate-900 rounded-container border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-card flex items-center justify-center bg-brand/15">
                    <ListPlus className="w-5 h-5 text-brand" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Add lists</h2>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-control hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="px-6 pt-4 pb-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search your lists…"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-card text-white placeholder-slate-500 focus:outline-hidden focus:border-brand/50 transition-colors text-sm"
                    autoFocus
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-6 pb-2 min-h-0">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    {candidateLists.length === 0
                      ? "All of your lists are already in this collection."
                      : "No lists match your search."}
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {filtered.map((list) => {
                      const isSelected = selected.has(list.id);
                      return (
                        <li key={list.id}>
                          <button
                            type="button"
                            onClick={() => toggle(list.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-card border text-left transition-colors ${
                              isSelected
                                ? "bg-brand/10 border-brand/40"
                                : "bg-slate-800/40 border-slate-700/40 hover:border-slate-600/60 hover:bg-slate-800/70"
                            }`}
                            aria-pressed={isSelected}
                          >
                            <div
                              className={`w-5 h-5 rounded-control flex items-center justify-center shrink-0 border transition-colors ${
                                isSelected
                                  ? "bg-brand border-brand"
                                  : "border-slate-600"
                              }`}
                            >
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-white" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-white truncate">
                                {list.title}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {list.category}
                                {list.size ? ` · ${list.size} items` : ""}
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 shrink-0">
                <span className="text-xs text-slate-500">
                  {selected.size > 0
                    ? `${selected.size} selected`
                    : `${candidateLists.length} available`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-control text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={selected.size === 0 || isPending}
                    className="px-4 py-2 rounded-control text-sm font-medium bg-brand text-white hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Add
                    {selected.size > 0 ? ` ${selected.size}` : ""}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

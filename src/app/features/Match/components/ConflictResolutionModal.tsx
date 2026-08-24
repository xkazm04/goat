'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  X,
  Cloud,
  Laptop,
  Merge,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { useState, useMemo } from 'react';

import { useModalAccessibility } from '@/hooks/use-modal-accessibility';
import { ConflictRecord, ConflictResolutionStrategy } from '@/lib/offline/types';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  conflicts: ConflictRecord[];
  onResolve: (
    conflictId: string,
    strategy: ConflictResolutionStrategy,
    mergedData?: unknown
  ) => Promise<void>;
  onClose: () => void;
}

interface ConflictDataPreview {
  label: string;
  localValue: string;
  serverValue: string;
  field: string;
}

/**
 * Extract previewable data from conflict records
 */
function extractConflictPreview(conflict: ConflictRecord): ConflictDataPreview[] {
  const previews: ConflictDataPreview[] = [];
  const local = conflict.localData as Record<string, unknown> | undefined;
  const server = conflict.serverData as Record<string, unknown> | undefined;

  if (!local || !server) return previews;

  // Compare grid items if present
  if ('gridItems' in local && 'gridItems' in server) {
    const localItems = local.gridItems as Array<{ position: number; matched: boolean; item?: { name: string } }>;
    const serverItems = server.gridItems as Array<{ position: number; matched: boolean; item?: { name: string } }>;

    const localMatched = localItems.filter((i) => i.matched).length;
    const serverMatched = serverItems.filter((i) => i.matched).length;

    previews.push({
      label: 'Matched Items',
      localValue: `${localMatched} items`,
      serverValue: `${serverMatched} items`,
      field: 'gridItems',
    });

    // Show first few differences
    for (let i = 0; i < Math.min(5, localItems.length); i++) {
      const localItem = localItems.find((item) => item.position === i + 1);
      const serverItem = serverItems.find((item) => item.position === i + 1);

      const localName = localItem?.item?.name || '(empty)';
      const serverName = serverItem?.item?.name || '(empty)';

      if (localName !== serverName) {
        previews.push({
          label: `Position ${i + 1}`,
          localValue: localName,
          serverValue: serverName,
          field: `position-${i + 1}`,
        });
      }
    }
  }

  // Compare timestamps
  if ('updatedAt' in local && 'updatedAt' in server) {
    previews.push({
      label: 'Last Updated',
      localValue: new Date(local.updatedAt as string).toLocaleString(),
      serverValue: new Date(server.updatedAt as string).toLocaleString(),
      field: 'updatedAt',
    });
  }

  return previews;
}

export function ConflictResolutionModal({
  isOpen,
  conflicts,
  onResolve,
  onClose,
}: ConflictResolutionModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const [selectedStrategy, setSelectedStrategy] =
    useState<ConflictResolutionStrategy>('server_wins');

  const { modalRef, modalProps, labelId, handleKeyDown } = useModalAccessibility({
    isOpen,
    onClose,
  });

  const currentConflict = conflicts[currentIndex] || null;
  const previews = useMemo(
    () => (currentConflict ? extractConflictPreview(currentConflict) : []),
    [currentConflict]
  );

  const handleResolve = async () => {
    if (!currentConflict) return;

    setIsResolving(true);
    try {
      await onResolve(currentConflict.id, selectedStrategy);

      // Move to next conflict or close
      if (currentIndex < conflicts.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onClose();
      }
    } finally {
      setIsResolving(false);
    }
  };

  const strategyOptions: Array<{
    id: ConflictResolutionStrategy;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'local_wins',
      label: 'Keep Local',
      description: 'Keep your local changes and overwrite the server version',
      icon: Laptop,
    },
    {
      id: 'server_wins',
      label: 'Keep Server',
      description: 'Use the server version and discard your local changes',
      icon: Cloud,
    },
    {
      id: 'merge',
      label: 'Auto Merge',
      description: 'Attempt to merge both versions (may need manual review)',
      icon: Merge,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-modal"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            {...modalProps}
            onKeyDown={handleKeyDown}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-modal"
          >
            <div className="bg-gray-900 border border-gray-700 rounded-container shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between bg-orange-900/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-600/20 rounded-control">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h2 id={labelId} className="text-lg font-semibold text-white">
                      Resolve Conflict
                    </h2>
                    <p className="text-sm text-gray-400">
                      {conflicts.length > 1
                        ? `${currentIndex + 1} of ${conflicts.length} conflicts`
                        : 'Your changes conflict with the server'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white transition-colors rounded-control hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              {currentConflict && (
                <div className="p-6 space-y-6">
                  {/* Conflict Info */}
                  <div className="bg-gray-800/50 rounded-card p-4">
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-gray-400">Conflict Type</span>
                      <span className="text-orange-400 font-medium capitalize">
                        {currentConflict.conflictType.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Entity</span>
                      <span className="text-gray-200 font-mono text-xs">
                        {currentConflict.entityId.slice(0, 8)}...
                      </span>
                    </div>
                  </div>

                  {/* Data Comparison */}
                  {previews.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-300">
                        Changes Comparison
                      </h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {previews.map((preview) => (
                          <div
                            key={preview.field}
                            className="bg-gray-800/30 rounded-card p-3"
                          >
                            <div className="text-xs text-gray-400 mb-2">
                              {preview.label}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center gap-2">
                                <Laptop className="w-3 h-3 text-blue-400 shrink-0" />
                                <span className="text-sm text-gray-200 truncate">
                                  {preview.localValue}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Cloud className="w-3 h-3 text-green-400 shrink-0" />
                                <span className="text-sm text-gray-200 truncate">
                                  {preview.serverValue}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolution Options */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-300">
                      How do you want to resolve this?
                    </h3>
                    <div className="space-y-2">
                      {strategyOptions.map((option) => {
                        const Icon = option.icon;
                        const isSelected = selectedStrategy === option.id;

                        return (
                          <button
                            key={option.id}
                            onClick={() => setSelectedStrategy(option.id)}
                            className={`w-full flex items-start gap-3 p-3 rounded-card border transition-all text-left ${
                              isSelected
                                ? 'border-brand bg-brand-muted/20'
                                : 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                            }`}
                          >
                            <div
                              className={`p-2 rounded-control ${
                                isSelected
                                  ? 'bg-brand-muted/20 text-brand-hover'
                                  : 'bg-gray-700/50 text-gray-400'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div
                                className={`font-medium ${
                                  isSelected ? 'text-brand-hover' : 'text-gray-200'
                                }`}
                              >
                                {option.label}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {option.description}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-5 h-5 text-brand-hover shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between bg-gray-800/30">
                {/* Navigation */}
                <div className="flex items-center gap-2">
                  {conflicts.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setCurrentIndex(Math.max(0, currentIndex - 1))
                        }
                        disabled={currentIndex === 0}
                        className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-control hover:bg-gray-700 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentIndex(
                            Math.min(conflicts.length - 1, currentIndex + 1)
                          )
                        }
                        disabled={currentIndex === conflicts.length - 1}
                        className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-control hover:bg-gray-700 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolve}
                    disabled={isResolving}
                    className="px-4 py-2 bg-brand-muted hover:bg-brand-muted disabled:bg-gray-600 text-white rounded-control font-medium transition-colors flex items-center gap-2"
                  >
                    {isResolving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Resolving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Resolve
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ConflictResolutionModal;

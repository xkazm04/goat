'use client';

import React, { createContext, useContext, useCallback, useRef, useState, useMemo, useEffect } from 'react';
import {
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragCancelEvent,
  DragMoveEvent,
} from '@dnd-kit/core';
import {
  TransferProtocol,
  TransferableItem,
  TransferSource,
  DropReceiver,
  TransferResult,
  TransferContext,
  TransferHoverPreview,
} from './transfer-protocol';

// ============================================================================
// Context
// ============================================================================

interface TransferProtocolContextValue<T extends TransferableItem = TransferableItem> {
  /** The protocol instance */
  protocol: TransferProtocol<T>;
  /** Currently active transfer context */
  activeContext: TransferContext<T> | null;
  /** Current hover preview */
  hoverPreview: TransferHoverPreview | null;
  /** Whether a drag is in progress */
  isDragging: boolean;
  /** The currently dragged item */
  activeItem: T | null;
  /** Register a source */
  registerSource: (source: TransferSource<T>) => void;
  /** Unregister a source */
  unregisterSource: (sourceId: string) => void;
  /** Register a receiver */
  registerReceiver: (receiver: DropReceiver<T>) => void;
  /** Unregister a receiver */
  unregisterReceiver: (receiverId: string) => void;
  /** DnD event handlers */
  handlers: {
    onDragStart: (event: DragStartEvent) => void;
    onDragOver: (event: DragOverEvent) => void;
    onDragEnd: (event: DragEndEvent) => void;
    onDragCancel: (event: DragCancelEvent) => void;
    onDragMove: (event: DragMoveEvent) => void;
  };
}

const TransferProtocolContext = createContext<TransferProtocolContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface TransferProtocolProviderProps<T extends TransferableItem = TransferableItem> {
  children: React.ReactNode;
  /** Optional callback when transfer starts */
  onTransferStart?: (context: TransferContext<T>) => void;
  /** Optional callback when transfer ends */
  onTransferEnd?: (result: TransferResult, context: TransferContext<T>) => void;
  /** Optional callback when transfer is cancelled */
  onTransferCancel?: (context: TransferContext<T>) => void;
  /** Optional callback for distance changes during drag */
  onDistanceChange?: (distance: number, delta: { x: number; y: number }) => void;
}

export function TransferProtocolProvider<T extends TransferableItem = TransferableItem>({
  children,
  onTransferStart,
  onTransferEnd,
  onTransferCancel,
  onDistanceChange,
}: TransferProtocolProviderProps<T>) {
  const [activeContext, setActiveContext] = useState<TransferContext<T> | null>(null);
  const [hoverPreview, setHoverPreview] = useState<TransferHoverPreview | null>(null);

  // Create protocol instance with callbacks
  const protocolRef = useRef<TransferProtocol<T> | null>(null);
  if (!protocolRef.current) {
    protocolRef.current = new TransferProtocol<T>({
      onTransferStart: (context) => {
        setActiveContext(context);
        onTransferStart?.(context);
      },
      onTransferEnd: (result, context) => {
        setActiveContext(null);
        setHoverPreview(null);
        onTransferEnd?.(result, context);
      },
      onTransferCancel: (context) => {
        setActiveContext(null);
        setHoverPreview(null);
        onTransferCancel?.(context);
      },
    });
  }

  const protocol = protocolRef.current;

  // Source/receiver registration
  const registerSource = useCallback((source: TransferSource<T>) => {
    protocol.registerSource(source);
  }, [protocol]);

  const unregisterSource = useCallback((sourceId: string) => {
    protocol.unregisterSource(sourceId);
  }, [protocol]);

  const registerReceiver = useCallback((receiver: DropReceiver<T>) => {
    protocol.registerReceiver(receiver);
  }, [protocol]);

  const unregisterReceiver = useCallback((receiverId: string) => {
    protocol.unregisterReceiver(receiverId);
  }, [protocol]);

  // DnD event handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    protocol.handleDragStart(event);
  }, [protocol]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const preview = protocol.handleDragOver(event);
    setHoverPreview(preview);
  }, [protocol]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    protocol.handleDragEnd(event);
  }, [protocol]);

  const handleDragCancel = useCallback((event: DragCancelEvent) => {
    protocol.handleDragCancel(event);
  }, [protocol]);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (event.delta && onDistanceChange) {
      const distance = Math.sqrt(
        Math.pow(event.delta.x, 2) + Math.pow(event.delta.y, 2)
      );
      onDistanceChange(distance, { x: event.delta.x, y: event.delta.y });
      protocol.updateDragDistance(distance, { x: event.delta.x, y: event.delta.y });
    }
  }, [protocol, onDistanceChange]);

  const handlers = useMemo(() => ({
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    onDragCancel: handleDragCancel,
    onDragMove: handleDragMove,
  }), [handleDragStart, handleDragOver, handleDragEnd, handleDragCancel, handleDragMove]);

  const value = useMemo<TransferProtocolContextValue<T>>(() => ({
    protocol,
    activeContext,
    hoverPreview,
    isDragging: activeContext !== null,
    activeItem: activeContext?.item ?? null,
    registerSource,
    unregisterSource,
    registerReceiver,
    unregisterReceiver,
    handlers,
  }), [
    protocol,
    activeContext,
    hoverPreview,
    registerSource,
    unregisterSource,
    registerReceiver,
    unregisterReceiver,
    handlers,
  ]);

  return (
    <TransferProtocolContext.Provider value={value as unknown as TransferProtocolContextValue}>
      {children}
    </TransferProtocolContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Access the transfer protocol context
 */
export function useTransferContext<T extends TransferableItem = TransferableItem>(): TransferProtocolContextValue<T> {
  const context = useContext(TransferProtocolContext);
  if (!context) {
    throw new Error('useTransferContext must be used within a TransferProtocolProvider');
  }
  return context as unknown as TransferProtocolContextValue<T>;
}

/**
 * Main hook for using the transfer protocol
 *
 * Provides:
 * - Source registration for draggable items
 * - Receiver registration for drop targets
 * - DnD event handlers for DndContext
 * - Active drag state
 */
export function useTransferProtocol<T extends TransferableItem = TransferableItem>() {
  const context = useTransferContext<T>();

  return {
    // State
    isDragging: context.isDragging,
    activeItem: context.activeItem,
    activeContext: context.activeContext,
    hoverPreview: context.hoverPreview,

    // Registration
    registerSource: context.registerSource,
    unregisterSource: context.unregisterSource,
    registerReceiver: context.registerReceiver,
    unregisterReceiver: context.unregisterReceiver,

    // Handlers for DndContext
    handlers: context.handlers,

    // Protocol instance for advanced usage
    protocol: context.protocol,
  };
}

/**
 * Hook to register a transfer source
 * Automatically unregisters on unmount
 */
export function useTransferSource<T extends TransferableItem = TransferableItem>(
  source: TransferSource<T> | null
) {
  const { registerSource, unregisterSource } = useTransferContext<T>();

  useEffect(() => {
    if (source) {
      registerSource(source);
      return () => unregisterSource(source.sourceId);
    }
  }, [source, registerSource, unregisterSource]);
}

/**
 * Hook to register a drop receiver
 * Automatically unregisters on unmount
 */
export function useDropReceiver<T extends TransferableItem = TransferableItem>(
  receiver: DropReceiver<T> | null
) {
  const { registerReceiver, unregisterReceiver } = useTransferContext<T>();

  useEffect(() => {
    if (receiver) {
      registerReceiver(receiver);
      return () => unregisterReceiver(receiver.receiverId);
    }
  }, [receiver, registerReceiver, unregisterReceiver]);
}

/**
 * Hook to register multiple receivers (e.g., for grid positions)
 */
export function useDropReceivers<T extends TransferableItem = TransferableItem>(
  receivers: DropReceiver<T>[]
) {
  const { registerReceiver, unregisterReceiver } = useTransferContext<T>();

  useEffect(() => {
    receivers.forEach(receiver => registerReceiver(receiver));
    return () => {
      receivers.forEach(receiver => unregisterReceiver(receiver.receiverId));
    };
  }, [receivers, registerReceiver, unregisterReceiver]);
}

export default useTransferProtocol;

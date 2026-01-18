/**
 * Command Factory Functions
 *
 * Type-safe factory functions for creating orchestrator commands.
 * Commands are immutable descriptions of state changes.
 */

import { BacklogItem } from '@/types/backlog-groups';
import { GridItemType } from '@/types/match';
import {
  AssignItemCommand,
  MoveItemCommand,
  SwapItemsCommand,
  RemoveItemCommand,
  RemoveItemByIdCommand,
  ClearGridCommand,
  InitializeSessionCommand,
  ResetSessionCommand,
  SaveSessionCommand,
  SwitchSessionCommand,
  OpenComparisonCommand,
  CloseComparisonCommand,
  AddToComparisonCommand,
  RemoveFromComparisonCommand,
  ClearComparisonCommand,
  SetKeyboardModeCommand,
  QuickAssignCommand,
  ShowResultModalCommand,
  HideResultModalCommand,
  CommandMeta,
} from './types';

// =============================================================================
// Utility
// =============================================================================

let correlationCounter = 0;

function createTimestamp(): number {
  return Date.now();
}

function createCorrelationId(): string {
  return `cmd-${Date.now()}-${++correlationCounter}`;
}

function createMeta(source?: string, undoable = true): CommandMeta {
  return {
    source,
    correlationId: createCorrelationId(),
    undoable,
  };
}

// =============================================================================
// Grid Commands
// =============================================================================

/**
 * Create an assign item command.
 * Assigns a backlog item to a specific grid position.
 */
export function assignItem(
  item: BacklogItem,
  position: number,
  source?: string
): AssignItemCommand {
  return {
    type: 'grid/assign',
    payload: { item, position },
    timestamp: createTimestamp(),
    meta: createMeta(source),
  };
}

/**
 * Create a move item command.
 * Moves an item from one grid position to another.
 * If target is occupied, performs a swap.
 */
export function moveItem(
  fromPosition: number,
  toPosition: number,
  source?: string
): MoveItemCommand {
  return {
    type: 'grid/move',
    payload: { fromPosition, toPosition },
    timestamp: createTimestamp(),
    meta: createMeta(source),
  };
}

/**
 * Create a swap items command.
 * Explicitly swaps items at two positions.
 */
export function swapItems(
  positionA: number,
  positionB: number,
  source?: string
): SwapItemsCommand {
  return {
    type: 'grid/swap',
    payload: { positionA, positionB },
    timestamp: createTimestamp(),
    meta: createMeta(source),
  };
}

/**
 * Create a remove item command.
 * Removes an item from a specific grid position.
 */
export function removeItem(position: number, source?: string): RemoveItemCommand {
  return {
    type: 'grid/remove',
    payload: { position },
    timestamp: createTimestamp(),
    meta: createMeta(source),
  };
}

/**
 * Create a remove item by ID command.
 * Removes an item from the grid by its backlog item ID.
 */
export function removeItemById(itemId: string, source?: string): RemoveItemByIdCommand {
  return {
    type: 'grid/removeById',
    payload: { itemId },
    timestamp: createTimestamp(),
    meta: createMeta(source),
  };
}

/**
 * Create a clear grid command.
 * Removes all items from the grid.
 */
export function clearGrid(source?: string): ClearGridCommand {
  return {
    type: 'grid/clear',
    payload: undefined,
    timestamp: createTimestamp(),
    meta: createMeta(source),
  };
}

// =============================================================================
// Session Commands
// =============================================================================

/**
 * Create an initialize session command.
 * Initializes a new match session for a list.
 */
export function initializeSession(
  listId: string,
  listSize: number,
  category?: string,
  source?: string
): InitializeSessionCommand {
  return {
    type: 'session/initialize',
    payload: { listId, listSize, category },
    timestamp: createTimestamp(),
    meta: createMeta(source, false), // Not undoable
  };
}

/**
 * Create a reset session command.
 * Resets the current match session to initial state.
 */
export function resetSession(source?: string): ResetSessionCommand {
  return {
    type: 'session/reset',
    payload: undefined,
    timestamp: createTimestamp(),
    meta: createMeta(source),
  };
}

/**
 * Create a save session command.
 * Saves the current session state to persistence.
 */
export function saveSession(listId?: string, source?: string): SaveSessionCommand {
  return {
    type: 'session/save',
    payload: { listId },
    timestamp: createTimestamp(),
    meta: createMeta(source, false), // Not undoable
  };
}

/**
 * Create a switch session command.
 * Switches to a different list's session.
 */
export function switchSession(listId: string, source?: string): SwitchSessionCommand {
  return {
    type: 'session/switch',
    payload: { listId },
    timestamp: createTimestamp(),
    meta: createMeta(source, false), // Not undoable
  };
}

// =============================================================================
// Comparison Commands
// =============================================================================

/**
 * Create an open comparison command.
 */
export function openComparison(source?: string): OpenComparisonCommand {
  return {
    type: 'comparison/open',
    payload: undefined,
    timestamp: createTimestamp(),
    meta: createMeta(source, false),
  };
}

/**
 * Create a close comparison command.
 */
export function closeComparison(source?: string): CloseComparisonCommand {
  return {
    type: 'comparison/close',
    payload: undefined,
    timestamp: createTimestamp(),
    meta: createMeta(source, false),
  };
}

/**
 * Create an add to comparison command.
 */
export function addToComparison(
  item: BacklogItem | GridItemType,
  source?: string
): AddToComparisonCommand {
  return {
    type: 'comparison/add',
    payload: { item },
    timestamp: createTimestamp(),
    meta: createMeta(source),
  };
}

/**
 * Create a remove from comparison command.
 */
export function removeFromComparison(
  itemId: string,
  source?: string
): RemoveFromComparisonCommand {
  return {
    type: 'comparison/remove',
    payload: { itemId },
    timestamp: createTimestamp(),
    meta: createMeta(source),
  };
}

/**
 * Create a clear comparison command.
 */
export function clearComparison(source?: string): ClearComparisonCommand {
  return {
    type: 'comparison/clear',
    payload: undefined,
    timestamp: createTimestamp(),
    meta: createMeta(source),
  };
}

// =============================================================================
// Match UI Commands
// =============================================================================

/**
 * Create a set keyboard mode command.
 */
export function setKeyboardMode(
  enabled: boolean,
  source?: string
): SetKeyboardModeCommand {
  return {
    type: 'match/keyboardMode',
    payload: { enabled },
    timestamp: createTimestamp(),
    meta: createMeta(source, false),
  };
}

/**
 * Create a quick assign command.
 * Assigns the currently selected backlog item to a position.
 */
export function quickAssign(position: number, source?: string): QuickAssignCommand {
  return {
    type: 'match/quickAssign',
    payload: { position },
    timestamp: createTimestamp(),
    meta: createMeta(source),
  };
}

/**
 * Create a show result modal command.
 */
export function showResultModal(source?: string): ShowResultModalCommand {
  return {
    type: 'match/showResult',
    payload: undefined,
    timestamp: createTimestamp(),
    meta: createMeta(source, false),
  };
}

/**
 * Create a hide result modal command.
 */
export function hideResultModal(source?: string): HideResultModalCommand {
  return {
    type: 'match/hideResult',
    payload: undefined,
    timestamp: createTimestamp(),
    meta: createMeta(source, false),
  };
}

// =============================================================================
// Command Inverses (for Undo)
// =============================================================================

/**
 * Get the inverse command for undo purposes.
 * Not all commands are invertible.
 */
export function getInverseCommand(
  command: AssignItemCommand,
  previousState: { position: number }
): RemoveItemCommand;
export function getInverseCommand(
  command: RemoveItemCommand,
  previousState: { item: BacklogItem; position: number }
): AssignItemCommand;
export function getInverseCommand(
  command: MoveItemCommand,
  previousState: { fromPosition: number; toPosition: number }
): MoveItemCommand;
export function getInverseCommand(
  command: SwapItemsCommand,
  previousState: { positionA: number; positionB: number }
): SwapItemsCommand;
export function getInverseCommand(
  command: unknown,
  previousState: unknown
): unknown {
  const cmd = command as { type: string; payload: unknown };
  const state = previousState as Record<string, unknown>;

  switch (cmd.type) {
    case 'grid/assign':
      // Inverse of assign is remove
      return removeItem(state.position as number, 'undo');

    case 'grid/remove':
      // Inverse of remove is assign
      return assignItem(state.item as BacklogItem, state.position as number, 'undo');

    case 'grid/move':
      // Inverse of move is move back
      return moveItem(state.toPosition as number, state.fromPosition as number, 'undo');

    case 'grid/swap':
      // Inverse of swap is swap again (same operation)
      return swapItems(state.positionA as number, state.positionB as number, 'undo');

    default:
      return null;
  }
}

// =============================================================================
// Command Descriptions (for UI)
// =============================================================================

/**
 * Get a human-readable description of a command.
 */
export function getCommandDescription(command: { type: string; payload: unknown }): string {
  switch (command.type) {
    case 'grid/assign': {
      const payload = command.payload as { item: BacklogItem; position: number };
      const title = payload.item.title || payload.item.name || 'item';
      return `Assign "${title}" to position ${payload.position + 1}`;
    }
    case 'grid/remove': {
      const payload = command.payload as { position: number };
      return `Remove item from position ${payload.position + 1}`;
    }
    case 'grid/removeById': {
      const payload = command.payload as { itemId: string };
      return `Remove item ${payload.itemId}`;
    }
    case 'grid/move': {
      const payload = command.payload as { fromPosition: number; toPosition: number };
      return `Move item from position ${payload.fromPosition + 1} to ${payload.toPosition + 1}`;
    }
    case 'grid/swap': {
      const payload = command.payload as { positionA: number; positionB: number };
      return `Swap positions ${payload.positionA + 1} and ${payload.positionB + 1}`;
    }
    case 'grid/clear':
      return 'Clear all items from grid';
    case 'session/initialize':
      return 'Initialize match session';
    case 'session/reset':
      return 'Reset match session';
    case 'session/save':
      return 'Save session';
    case 'session/switch':
      return 'Switch session';
    case 'comparison/open':
      return 'Open comparison panel';
    case 'comparison/close':
      return 'Close comparison panel';
    case 'comparison/add':
      return 'Add item to comparison';
    case 'comparison/remove':
      return 'Remove item from comparison';
    case 'comparison/clear':
      return 'Clear comparison';
    case 'match/keyboardMode':
      return 'Toggle keyboard mode';
    case 'match/quickAssign':
      return 'Quick assign item';
    case 'match/showResult':
      return 'Show result modal';
    case 'match/hideResult':
      return 'Hide result modal';
    default:
      return `Unknown command: ${command.type}`;
  }
}

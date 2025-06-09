import { ListSession, SessionProgress } from './types';
import { GridItemType, BacklogGroupType } from '@/app/types/match';

export class SessionManager {
  static createEmptySession(listId: string, size: number): ListSession {
    const gridItems = Array.from({ length: size }, (_, index) => ({
      id: `grid-${index}`,
      title: '',
      tags: [],
      matched: false,
    }));

    return {
      id: `session-${listId}`,
      listId,
      listSize: size,
      gridItems,
      backlogGroups: [],
      selectedBacklogItem: null,
      selectedGridItem: null,
      compareList: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false
    };
  }

  static updateSessionTimestamp(session: ListSession): ListSession {
    return {
      ...session,
      updatedAt: new Date().toISOString()
    };
  }

  static markSessionSynced(session: ListSession): ListSession {
    return {
      ...session,
      synced: true,
      updatedAt: new Date().toISOString()
    };
  }

  static validateSession(session: ListSession): boolean {
    return (
      session.id &&
      session.listId &&
      session.gridItems &&
      Array.isArray(session.gridItems) &&
      session.gridItems.length === session.listSize
    );
  }

  static calculateProgress(gridItems: GridItemType[]): SessionProgress {
    const matchedCount = gridItems.filter(item => item.matched).length;
    const totalSize = gridItems.length;
    const percentage = totalSize > 0 ? (matchedCount / totalSize) * 100 : 0;

    return {
      matchedCount,
      totalSize,
      percentage,
      isComplete: percentage === 100
    };
  }

  static hasUnsavedChanges(session: ListSession): boolean {
    const lastUpdate = new Date(session.updatedAt);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastUpdate > fiveMinutesAgo && !session.synced;
  }

  static getSessionMetadata(session: ListSession) {
    const progress = this.calculateProgress(session.gridItems);
    return {
      id: session.id,
      listId: session.listId,
      listSize: session.listSize,
      progress,
      lastUpdated: session.updatedAt,
      synced: session.synced,
      hasUnsavedChanges: this.hasUnsavedChanges(session)
    };
  }
}
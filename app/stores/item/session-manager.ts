import { ListSession, SessionProgress } from './types';
import { GridItemType } from '@/app/types/match';

export class SessionManager {
  static createEmptySession(listId: string, size: number): ListSession {
    return {
      listId,
      listSize: size,
      gridItems: Array.from({ length: size }, (_, index) => ({
        id: `grid-${index}`,
        title: '',
        tags: [],
        matched: false,
      })),
      backlogGroups: [],
      selectedBacklogItem: null,
      selectedGridItem: null,
      compareList: [],
      lastModified: new Date().toISOString(),
      lastSynced: undefined
    };
  }

  static validateSession(session: ListSession): boolean {
    return !!(
      session.listId &&
      session.listSize > 0 &&
      Array.isArray(session.gridItems) &&
      session.gridItems.length === session.listSize &&
      Array.isArray(session.backlogGroups)
    );
  }

  static calculateProgress(gridItems: GridItemType[]): SessionProgress {
    const matched = gridItems.filter(item => item.matched).length;
    const total = gridItems.length;
    const percentage = total > 0 ? (matched / total) * 100 : 0;
    
    return { matched, total, percentage };
  }

  static hasUnsavedChanges(session: ListSession): boolean {
    if (!session.lastSynced) return true;
    
    const lastModified = new Date(session.lastModified);
    const lastSynced = new Date(session.lastSynced);
    
    return lastModified > lastSynced;
  }

  static updateSessionTimestamp(session: ListSession): ListSession {
    return {
      ...session,
      lastModified: new Date().toISOString()
    };
  }

  static markSessionSynced(session: ListSession): ListSession {
    return {
      ...session,
      lastSynced: new Date().toISOString()
    };
  }

  static getSessionMetadata(session: ListSession): any {
    return {
      listId: session.listId,
      size: session.listSize,
      progress: this.calculateProgress(session.gridItems),
      lastModified: session.lastModified,
      hasUnsavedChanges: this.hasUnsavedChanges(session)
    };
  }
}
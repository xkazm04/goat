export const bookmarkKeys = {
  all: ['bookmarks'] as const,
  user: (userId: string) => [...bookmarkKeys.all, 'user', userId] as const,
  folder: (userId: string, folderId: string) =>
    [...bookmarkKeys.all, 'user', userId, 'folder', folderId] as const,
};

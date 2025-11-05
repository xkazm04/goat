import { BacklogGroupType } from '@/types/match';

export class DefaultDataProvider {
  static getDefaultBacklogGroups(category: string = 'general'): BacklogGroupType[] {
    switch (category.toLowerCase()) {
      case 'sports':
        return this.getSportsBacklogGroups();
      case 'music':
        return this.getMusicBacklogGroups();
      case 'games':
        return this.getGamesBacklogGroups();
      case 'movies':
        return this.getMoviesBacklogGroups();
      default:
        return this.getGeneralBacklogGroups();
    }
  }

  private static getSportsBacklogGroups(): BacklogGroupType[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'legends',
        name: 'Legendary Athletes',
        title: 'Legendary Athletes',
        category: 'sports',
        item_count: 3,
        created_at: now,
        isOpen: true,
        items: [
          { id: 'item-1', title: 'Michael Jordan', category: 'sports', created_at: now, matched: false, tags: ['basketball', 'legend'] },
          { id: 'item-2', title: 'LeBron James', category: 'sports', created_at: now, matched: false, tags: ['basketball', 'modern'] },
          { id: 'item-3', title: 'Kobe Bryant', category: 'sports', created_at: now, matched: false, tags: ['basketball', 'legend'] }
        ]
      },
      {
        id: 'teams',
        name: 'Greatest Teams',
        title: 'Greatest Teams',
        category: 'sports',
        item_count: 2,
        created_at: now,
        isOpen: false,
        items: [
          { id: 'item-4', title: '1996 Chicago Bulls', category: 'sports', created_at: now, matched: false, tags: ['team', 'basketball'] },
          { id: 'item-5', title: '2017 Golden State Warriors', category: 'sports', created_at: now, matched: false, tags: ['team', 'basketball'] }
        ]
      }
    ];
  }

  private static getMusicBacklogGroups(): BacklogGroupType[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'artists',
        name: 'Legendary Artists',
        title: 'Legendary Artists',
        category: 'music',
        item_count: 3,
        created_at: now,
        isOpen: true,
        items: [
          { id: 'item-1', title: 'The Beatles', category: 'music', created_at: now, matched: false, tags: ['rock', 'classic'] },
          { id: 'item-2', title: 'Michael Jackson', category: 'music', created_at: now, matched: false, tags: ['pop', 'legend'] },
          { id: 'item-3', title: 'Bob Dylan', category: 'music', created_at: now, matched: false, tags: ['folk', 'songwriter'] }
        ]
      },
      {
        id: 'albums',
        name: 'Classic Albums',
        title: 'Classic Albums',
        category: 'music',
        item_count: 2,
        created_at: now,
        isOpen: false,
        items: [
          { id: 'item-4', title: 'Abbey Road', category: 'music', created_at: now, matched: false, tags: ['album', 'rock'] },
          { id: 'item-5', title: 'Thriller', category: 'music', created_at: now, matched: false, tags: ['album', 'pop'] }
        ]
      }
    ];
  }

  private static getGamesBacklogGroups(): BacklogGroupType[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'classics',
        name: 'Gaming Classics',
        title: 'Gaming Classics',
        category: 'games',
        item_count: 3,
        created_at: now,
        isOpen: true,
        items: [
          { id: 'item-1', title: 'Super Mario Bros.', category: 'games', created_at: now, matched: false, tags: ['platformer', 'nintendo'] },
          { id: 'item-2', title: 'The Legend of Zelda', category: 'games', created_at: now, matched: false, tags: ['adventure', 'nintendo'] },
          { id: 'item-3', title: 'Tetris', category: 'games', created_at: now, matched: false, tags: ['puzzle', 'classic'] }
        ]
      },
      {
        id: 'modern',
        name: 'Modern Masterpieces',
        title: 'Modern Masterpieces',
        category: 'games',
        item_count: 2,
        created_at: now,
        isOpen: false,
        items: [
          { id: 'item-4', title: 'The Witcher 3', category: 'games', created_at: now, matched: false, tags: ['rpg', 'modern'] },
          { id: 'item-5', title: 'Minecraft', category: 'games', created_at: now, matched: false, tags: ['sandbox', 'indie'] }
        ]
      }
    ];
  }

  private static getMoviesBacklogGroups(): BacklogGroupType[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'classics',
        name: 'Cinema Classics',
        title: 'Cinema Classics',
        category: 'movies',
        item_count: 3,
        created_at: now,
        isOpen: true,
        items: [
          { id: 'item-1', title: 'The Godfather', category: 'movies', created_at: now, matched: false, tags: ['drama', 'classic'] },
          { id: 'item-2', title: 'Casablanca', category: 'movies', created_at: now, matched: false, tags: ['romance', 'classic'] },
          { id: 'item-3', title: 'Citizen Kane', category: 'movies', created_at: now, matched: false, tags: ['drama', 'classic'] }
        ]
      },
      {
        id: 'modern',
        name: 'Modern Classics',
        title: 'Modern Classics',
        category: 'movies',
        item_count: 2,
        created_at: now,
        isOpen: false,
        items: [
          { id: 'item-4', title: 'Pulp Fiction', category: 'movies', created_at: now, matched: false, tags: ['drama', 'modern'] },
          { id: 'item-5', title: 'Inception', category: 'movies', created_at: now, matched: false, tags: ['sci-fi', 'modern'] }
        ]
      }
    ];
  }

  private static getGeneralBacklogGroups(): BacklogGroupType[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'favorites',
        name: 'Personal Favorites',
        title: 'Personal Favorites',
        category: 'general',
        item_count: 3,
        created_at: now,
        isOpen: true,
        items: [
          { id: 'item-1', title: 'Sample Item 1', category: 'general', created_at: now, matched: false, tags: ['favorite'] },
          { id: 'item-2', title: 'Sample Item 2', category: 'general', created_at: now, matched: false, tags: ['favorite'] },
          { id: 'item-3', title: 'Sample Item 3', category: 'general', created_at: now, matched: false, tags: ['favorite'] }
        ]
      },
      {
        id: 'discoveries',
        name: 'New Discoveries',
        title: 'New Discoveries',
        category: 'general',
        item_count: 2,
        created_at: now,
        isOpen: false,
        items: [
          { id: 'item-4', title: 'Discovery 1', category: 'general', created_at: now, matched: false, tags: ['new'] },
          { id: 'item-5', title: 'Discovery 2', category: 'general', created_at: now, matched: false, tags: ['new'] }
        ]
      }
    ];
  }
}
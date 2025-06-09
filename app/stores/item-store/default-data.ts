import { BacklogGroupType } from '@/app/types/match';
import { Users, Gamepad2, Trophy, Music, Film, Book } from 'lucide-react';

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
    return [
      {
        id: 'legends',
        title: 'Legendary Athletes',
        isOpen: true,
        items: [
          { id: 'item-1', title: 'Michael Jordan', matched: false, tags: ['basketball', 'legend'] },
          { id: 'item-2', title: 'LeBron James', matched: false, tags: ['basketball', 'modern'] },
          { id: 'item-3', title: 'Kobe Bryant', matched: false, tags: ['basketball', 'legend'] }
        ]
      },
      {
        id: 'teams',
        title: 'Greatest Teams',
        isOpen: false,
        items: [
          { id: 'item-4', title: '1996 Chicago Bulls', matched: false, tags: ['team', 'basketball'] },
          { id: 'item-5', title: '2017 Golden State Warriors', matched: false, tags: ['team', 'basketball'] }
        ]
      }
    ];
  }

  private static getMusicBacklogGroups(): BacklogGroupType[] {
    return [
      {
        id: 'artists',
        title: 'Legendary Artists',
        isOpen: true,
        items: [
          { id: 'item-1', title: 'The Beatles', matched: false, tags: ['rock', 'classic'] },
          { id: 'item-2', title: 'Michael Jackson', matched: false, tags: ['pop', 'legend'] },
          { id: 'item-3', title: 'Bob Dylan', matched: false, tags: ['folk', 'songwriter'] }
        ]
      },
      {
        id: 'albums',
        title: 'Classic Albums',
        isOpen: false,
        items: [
          { id: 'item-4', title: 'Abbey Road', matched: false, tags: ['album', 'rock'] },
          { id: 'item-5', title: 'Thriller', matched: false, tags: ['album', 'pop'] }
        ]
      }
    ];
  }

  private static getGamesBacklogGroups(): BacklogGroupType[] {
    return [
      {
        id: 'classics',
        title: 'Gaming Classics',
        isOpen: true,
        items: [
          { id: 'item-1', title: 'Super Mario Bros.', matched: false, tags: ['platformer', 'nintendo'] },
          { id: 'item-2', title: 'The Legend of Zelda', matched: false, tags: ['adventure', 'nintendo'] },
          { id: 'item-3', title: 'Tetris', matched: false, tags: ['puzzle', 'classic'] }
        ]
      },
      {
        id: 'modern',
        title: 'Modern Masterpieces',
        isOpen: false,
        items: [
          { id: 'item-4', title: 'The Witcher 3', matched: false, tags: ['rpg', 'modern'] },
          { id: 'item-5', title: 'Minecraft', matched: false, tags: ['sandbox', 'indie'] }
        ]
      }
    ];
  }

  private static getMoviesBacklogGroups(): BacklogGroupType[] {
    return [
      {
        id: 'classics',
        title: 'Cinema Classics',
        isOpen: true,
        items: [
          { id: 'item-1', title: 'The Godfather', matched: false, tags: ['drama', 'classic'] },
          { id: 'item-2', title: 'Casablanca', matched: false, tags: ['romance', 'classic'] },
          { id: 'item-3', title: 'Citizen Kane', matched: false, tags: ['drama', 'classic'] }
        ]
      },
      {
        id: 'modern',
        title: 'Modern Classics',
        isOpen: false,
        items: [
          { id: 'item-4', title: 'Pulp Fiction', matched: false, tags: ['drama', 'modern'] },
          { id: 'item-5', title: 'Inception', matched: false, tags: ['sci-fi', 'modern'] }
        ]
      }
    ];
  }

  private static getGeneralBacklogGroups(): BacklogGroupType[] {
    return [
      {
        id: 'favorites',
        title: 'Personal Favorites',
        isOpen: true,
        items: [
          { id: 'item-1', title: 'Sample Item 1', matched: false, tags: ['favorite'] },
          { id: 'item-2', title: 'Sample Item 2', matched: false, tags: ['favorite'] },
          { id: 'item-3', title: 'Sample Item 3', matched: false, tags: ['favorite'] }
        ]
      },
      {
        id: 'discoveries',
        title: 'New Discoveries',
        isOpen: false,
        items: [
          { id: 'item-4', title: 'Discovery 1', matched: false, tags: ['new'] },
          { id: 'item-5', title: 'Discovery 2', matched: false, tags: ['new'] }
        ]
      }
    ];
  }
}
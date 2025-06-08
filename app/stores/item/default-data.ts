import { BacklogGroupType } from '@/app/types/match';

export class DefaultDataProvider {
  static getDefaultBacklogGroups(category: string): BacklogGroupType[] {
    switch (category.toLowerCase()) {
      case 'sports':
        return this.getSportsGroups();
      case 'games':
        return this.getGamesGroups();
      case 'music':
        return this.getMusicGroups();
      default:
        return this.getGeneralGroups();
    }
  }

  private static getSportsGroups(): BacklogGroupType[] {
    return [
      {
        id: 'basketball-legends',
        title: 'Basketball Legends',
        isOpen: true,
        items: [
          { id: 'mj-23', title: 'Michael Jordan', matched: false, tags: ['nba', 'chicago-bulls'] },
          { id: 'lebron-6', title: 'LeBron James', matched: false, tags: ['nba', 'cleveland', 'miami', 'lakers'] },
          { id: 'kobe-24', title: 'Kobe Bryant', matched: false, tags: ['nba', 'lakers'] },
          { id: 'tim-duncan', title: 'Tim Duncan', matched: false, tags: ['nba', 'spurs'] },
          { id: 'shaq', title: "Shaquille O'Neal", matched: false, tags: ['nba', 'lakers', 'center'] },
          { id: 'magic-32', title: 'Magic Johnson', matched: false, tags: ['nba', 'lakers', 'point-guard'] },
          { id: 'bird-33', title: 'Larry Bird', matched: false, tags: ['nba', 'celtics', 'forward'] },
          { id: 'kareem-33', title: 'Kareem Abdul-Jabbar', matched: false, tags: ['nba', 'lakers', 'center'] },
        ]
      },
      {
        id: 'soccer-icons',
        title: 'Soccer Icons',
        isOpen: true,
        items: [
          { id: 'messi', title: 'Lionel Messi', matched: false, tags: ['soccer', 'argentina', 'psg'] },
          { id: 'ronaldo', title: 'Cristiano Ronaldo', matched: false, tags: ['soccer', 'portugal', 'manchester-united'] },
          { id: 'pele', title: 'Pelé', matched: false, tags: ['soccer', 'brazil', 'legend'] },
          { id: 'maradona', title: 'Diego Maradona', matched: false, tags: ['soccer', 'argentina', 'legend'] },
          { id: 'ronaldinho', title: 'Ronaldinho', matched: false, tags: ['soccer', 'brazil', 'barcelona'] },
          { id: 'zidane', title: 'Zinedine Zidane', matched: false, tags: ['soccer', 'france', 'real-madrid'] },
        ]
      },
      {
        id: 'tennis-greats',
        title: 'Tennis Greats',
        isOpen: false,
        items: [
          { id: 'federer', title: 'Roger Federer', matched: false, tags: ['tennis', 'switzerland'] },
          { id: 'nadal', title: 'Rafael Nadal', matched: false, tags: ['tennis', 'spain'] },
          { id: 'djokovic', title: 'Novak Djokovic', matched: false, tags: ['tennis', 'serbia'] },
          { id: 'serena', title: 'Serena Williams', matched: false, tags: ['tennis', 'usa', 'women'] },
        ]
      }
    ];
  }

  private static getGamesGroups(): BacklogGroupType[] {
    return [
      {
        id: 'classic-games',
        title: 'Classic Games',
        isOpen: true,
        items: [
          { id: 'mario-bros', title: 'Super Mario Bros', matched: false, tags: ['nintendo', 'platformer'] },
          { id: 'zelda-ocarina', title: 'The Legend of Zelda: Ocarina of Time', matched: false, tags: ['nintendo', 'adventure'] },
          { id: 'half-life-2', title: 'Half-Life 2', matched: false, tags: ['valve', 'fps'] },
          { id: 'minecraft', title: 'Minecraft', matched: false, tags: ['indie', 'sandbox'] },
          { id: 'tetris', title: 'Tetris', matched: false, tags: ['puzzle', 'classic'] },
          { id: 'street-fighter-2', title: 'Street Fighter II', matched: false, tags: ['fighting', 'arcade'] },
        ]
      },
      {
        id: 'modern-games',
        title: 'Modern Games',
        isOpen: true,
        items: [
          { id: 'witcher-3', title: 'The Witcher 3', matched: false, tags: ['rpg', 'open-world'] },
          { id: 'god-of-war', title: 'God of War (2018)', matched: false, tags: ['action', 'playstation'] },
          { id: 'red-dead-2', title: 'Red Dead Redemption 2', matched: false, tags: ['action', 'open-world'] },
          { id: 'breath-of-wild', title: 'Breath of the Wild', matched: false, tags: ['nintendo', 'adventure'] },
          { id: 'last-of-us', title: 'The Last of Us', matched: false, tags: ['action', 'story'] },
        ]
      },
      {
        id: 'indie-gems',
        title: 'Indie Gems',
        isOpen: false,
        items: [
          { id: 'hollow-knight', title: 'Hollow Knight', matched: false, tags: ['indie', 'metroidvania'] },
          { id: 'celeste', title: 'Celeste', matched: false, tags: ['indie', 'platformer'] },
          { id: 'hades', title: 'Hades', matched: false, tags: ['indie', 'roguelike'] },
        ]
      }
    ];
  }

  private static getMusicGroups(): BacklogGroupType[] {
    return [
      {
        id: 'rock-legends',
        title: 'Rock Legends',
        isOpen: true,
        items: [
          { id: 'beatles', title: 'The Beatles', matched: false, tags: ['rock', '60s'] },
          { id: 'led-zeppelin', title: 'Led Zeppelin', matched: false, tags: ['hard-rock', '70s'] },
          { id: 'queen', title: 'Queen', matched: false, tags: ['arena-rock', 'freddie'] },
          { id: 'rolling-stones', title: 'The Rolling Stones', matched: false, tags: ['rock', 'classic'] },
          { id: 'pink-floyd', title: 'Pink Floyd', matched: false, tags: ['progressive-rock', '70s'] },
        ]
      },
      {
        id: 'modern-artists',
        title: 'Modern Artists',
        isOpen: true,
        items: [
          { id: 'radiohead', title: 'Radiohead', matched: false, tags: ['alternative', 'experimental'] },
          { id: 'nirvana', title: 'Nirvana', matched: false, tags: ['grunge', '90s'] },
          { id: 'arcade-fire', title: 'Arcade Fire', matched: false, tags: ['indie', 'alternative'] },
        ]
      }
    ];
  }

  private static getGeneralGroups(): BacklogGroupType[] {
    return [
      {
        id: 'general-items',
        title: 'Items',
        isOpen: true,
        items: []
      }
    ];
  }
}
/**
 * Curated List Templates
 *
 * Pre-built list skeletons that reduce cold-start friction in the Studio.
 * Each template pre-fills topic, category, criteria, and a set of canonical
 * starter items. Users can generate more items on top of these seeds.
 */

import type { ListTemplate } from '@/types/studio';

// ─────────────────────────────────────────────────────────────
// Games Templates
// ─────────────────────────────────────────────────────────────

const HORROR_GAMES: ListTemplate = {
  id: 'tpl-horror-games',
  name: 'Top Horror Games',
  description: 'The scariest and most influential horror games of all time',
  category: 'Games',
  topic: 'Best Horror Games of All Time',
  listSize: 20,
  generateCount: 30,
  criteriaProfileId: 'template-games',
  starterItems: [
    { title: 'Silent Hill 2', description: 'Psychological horror masterpiece by Konami', wikipedia_url: 'https://en.wikipedia.org/wiki/Silent_Hill_2' },
    { title: 'Resident Evil 4', description: 'Genre-defining survival horror action game', wikipedia_url: 'https://en.wikipedia.org/wiki/Resident_Evil_4' },
    { title: 'Amnesia: The Dark Descent', description: 'First-person survival horror that popularized the helpless protagonist', wikipedia_url: 'https://en.wikipedia.org/wiki/Amnesia:_The_Dark_Descent' },
    { title: 'Dead Space', description: 'Sci-fi horror aboard a derelict mining ship', wikipedia_url: 'https://en.wikipedia.org/wiki/Dead_Space_(2008_video_game)' },
    { title: 'P.T.', description: 'Hideo Kojima\'s legendary playable teaser', wikipedia_url: 'https://en.wikipedia.org/wiki/P.T._(video_game)' },
  ],
  tags: ['horror', 'survival', 'scary'],
  icon: '👻',
};

const RPG_GAMES: ListTemplate = {
  id: 'tpl-rpg-games',
  name: 'Greatest RPGs',
  description: 'The best role-playing games across all platforms and eras',
  category: 'Games',
  topic: 'Greatest RPGs of All Time',
  listSize: 20,
  generateCount: 30,
  criteriaProfileId: 'template-games',
  starterItems: [
    { title: 'The Witcher 3: Wild Hunt', description: 'Open-world RPG with rich storytelling', wikipedia_url: 'https://en.wikipedia.org/wiki/The_Witcher_3:_Wild_Hunt' },
    { title: 'Baldur\'s Gate 3', description: 'D&D-based RPG with deep choice systems', wikipedia_url: 'https://en.wikipedia.org/wiki/Baldur%27s_Gate_3' },
    { title: 'Chrono Trigger', description: 'SNES classic with time travel and multiple endings', wikipedia_url: 'https://en.wikipedia.org/wiki/Chrono_Trigger' },
    { title: 'Final Fantasy VII', description: 'Iconic JRPG that defined a generation', wikipedia_url: 'https://en.wikipedia.org/wiki/Final_Fantasy_VII' },
    { title: 'Elden Ring', description: 'Open-world action RPG by FromSoftware', wikipedia_url: 'https://en.wikipedia.org/wiki/Elden_Ring' },
  ],
  tags: ['rpg', 'adventure', 'story'],
  icon: '⚔️',
};

const INDIE_GAMES: ListTemplate = {
  id: 'tpl-indie-games',
  name: 'Best Indie Games',
  description: 'Standout indie titles that punched above their weight',
  category: 'Games',
  topic: 'Best Indie Games of All Time',
  listSize: 20,
  generateCount: 30,
  criteriaProfileId: 'template-games',
  starterItems: [
    { title: 'Hollow Knight', description: 'Metroidvania set in a hauntingly beautiful bug kingdom', wikipedia_url: 'https://en.wikipedia.org/wiki/Hollow_Knight' },
    { title: 'Celeste', description: 'Precision platformer about climbing a mountain', wikipedia_url: 'https://en.wikipedia.org/wiki/Celeste_(video_game)' },
    { title: 'Hades', description: 'Roguelike dungeon crawler with stellar narrative', wikipedia_url: 'https://en.wikipedia.org/wiki/Hades_(video_game)' },
    { title: 'Stardew Valley', description: 'Farming simulation RPG', wikipedia_url: 'https://en.wikipedia.org/wiki/Stardew_Valley' },
    { title: 'Undertale', description: 'RPG where every monster can be spared', wikipedia_url: 'https://en.wikipedia.org/wiki/Undertale' },
  ],
  tags: ['indie', 'creative', 'innovative'],
  icon: '🎮',
};

// ─────────────────────────────────────────────────────────────
// Stories Templates (Movies, TV, Books, Anime)
// ─────────────────────────────────────────────────────────────

const SCI_FI_MOVIES: ListTemplate = {
  id: 'tpl-scifi-movies',
  name: 'Top Sci-Fi Movies',
  description: 'The greatest science fiction films ever made',
  category: 'Stories',
  topic: 'Best Sci-Fi Movies of All Time',
  listSize: 20,
  generateCount: 30,
  criteriaProfileId: 'template-movies',
  starterItems: [
    { title: 'Blade Runner', description: '1982 neo-noir sci-fi directed by Ridley Scott', wikipedia_url: 'https://en.wikipedia.org/wiki/Blade_Runner' },
    { title: '2001: A Space Odyssey', description: 'Stanley Kubrick\'s landmark science fiction film', wikipedia_url: 'https://en.wikipedia.org/wiki/2001:_A_Space_Odyssey_(film)' },
    { title: 'The Matrix', description: 'Cyberpunk action film about simulated reality', wikipedia_url: 'https://en.wikipedia.org/wiki/The_Matrix' },
    { title: 'Alien', description: 'Ridley Scott\'s sci-fi horror classic', wikipedia_url: 'https://en.wikipedia.org/wiki/Alien_(film)' },
    { title: 'Interstellar', description: 'Christopher Nolan\'s space exploration epic', wikipedia_url: 'https://en.wikipedia.org/wiki/Interstellar_(film)' },
  ],
  tags: ['sci-fi', 'movies', 'space'],
  icon: '🚀',
};

const ANIMATED_MOVIES: ListTemplate = {
  id: 'tpl-animated-movies',
  name: 'Best Animated Films',
  description: 'The finest animated movies from every studio and era',
  category: 'Stories',
  topic: 'Best Animated Movies of All Time',
  listSize: 20,
  generateCount: 30,
  criteriaProfileId: 'template-movies',
  starterItems: [
    { title: 'Spirited Away', description: 'Studio Ghibli masterpiece by Hayao Miyazaki', wikipedia_url: 'https://en.wikipedia.org/wiki/Spirited_Away' },
    { title: 'Spider-Man: Into the Spider-Verse', description: 'Groundbreaking animated superhero film', wikipedia_url: 'https://en.wikipedia.org/wiki/Spider-Man:_Into_the_Spider-Verse' },
    { title: 'The Lion King', description: 'Disney\'s beloved animated classic', wikipedia_url: 'https://en.wikipedia.org/wiki/The_Lion_King' },
    { title: 'WALL-E', description: 'Pixar\'s poignant robot love story', wikipedia_url: 'https://en.wikipedia.org/wiki/WALL-E' },
    { title: 'Akira', description: 'Landmark anime cyberpunk film', wikipedia_url: 'https://en.wikipedia.org/wiki/Akira_(1988_film)' },
  ],
  tags: ['animation', 'anime', 'disney', 'pixar'],
  icon: '🎬',
};

const TOP_ANIME: ListTemplate = {
  id: 'tpl-top-anime',
  name: 'Greatest Anime Series',
  description: 'The most acclaimed and influential anime series',
  category: 'Stories',
  topic: 'Greatest Anime Series of All Time',
  listSize: 20,
  generateCount: 30,
  criteriaProfileId: 'template-tv-shows',
  starterItems: [
    { title: 'Fullmetal Alchemist: Brotherhood', description: 'Epic fantasy adventure about two alchemist brothers', wikipedia_url: 'https://en.wikipedia.org/wiki/Fullmetal_Alchemist:_Brotherhood' },
    { title: 'Steins;Gate', description: 'Sci-fi thriller about time travel', wikipedia_url: 'https://en.wikipedia.org/wiki/Steins;Gate_(TV_series)' },
    { title: 'Attack on Titan', description: 'Dark fantasy series about humanity\'s fight for survival', wikipedia_url: 'https://en.wikipedia.org/wiki/Attack_on_Titan' },
    { title: 'Cowboy Bebop', description: 'Space western with jazz-infused style', wikipedia_url: 'https://en.wikipedia.org/wiki/Cowboy_Bebop' },
    { title: 'Neon Genesis Evangelion', description: 'Deconstructive mecha anime', wikipedia_url: 'https://en.wikipedia.org/wiki/Neon_Genesis_Evangelion' },
  ],
  tags: ['anime', 'manga', 'japanese'],
  icon: '⛩️',
};

// ─────────────────────────────────────────────────────────────
// Music Templates
// ─────────────────────────────────────────────────────────────

const ALBUMS_BY_GENRE: ListTemplate = {
  id: 'tpl-albums-genre',
  name: 'Best Albums by Genre',
  description: 'The most essential albums across every genre of music',
  category: 'Music',
  topic: 'Best Albums of All Time Across All Genres',
  listSize: 50,
  generateCount: 70,
  criteriaProfileId: 'template-music',
  starterItems: [
    { title: 'OK Computer', description: 'Radiohead\'s genre-defining alt-rock album', wikipedia_url: 'https://en.wikipedia.org/wiki/OK_Computer' },
    { title: 'To Pimp a Butterfly', description: 'Kendrick Lamar\'s jazz-rap masterpiece', wikipedia_url: 'https://en.wikipedia.org/wiki/To_Pimp_a_Butterfly' },
    { title: 'Abbey Road', description: 'The Beatles\' iconic final recorded album', wikipedia_url: 'https://en.wikipedia.org/wiki/Abbey_Road' },
    { title: 'Kind of Blue', description: 'Miles Davis\' landmark modal jazz album', wikipedia_url: 'https://en.wikipedia.org/wiki/Kind_of_Blue' },
    { title: 'Rumours', description: 'Fleetwood Mac\'s best-selling soft rock classic', wikipedia_url: 'https://en.wikipedia.org/wiki/Rumours_(album)' },
  ],
  tags: ['albums', 'genre', 'classic'],
  icon: '💿',
};

const HIP_HOP_ALBUMS: ListTemplate = {
  id: 'tpl-hiphop-albums',
  name: 'Top Hip-Hop Albums',
  description: 'The greatest hip-hop and rap albums ever released',
  category: 'Music',
  topic: 'Greatest Hip-Hop Albums of All Time',
  listSize: 20,
  generateCount: 30,
  criteriaProfileId: 'template-music',
  starterItems: [
    { title: 'Illmatic', description: 'Nas\' debut — a cornerstone of hip-hop', wikipedia_url: 'https://en.wikipedia.org/wiki/Illmatic' },
    { title: 'My Beautiful Dark Twisted Fantasy', description: 'Kanye West\'s maximalist rap opus', wikipedia_url: 'https://en.wikipedia.org/wiki/My_Beautiful_Dark_Twisted_Fantasy' },
    { title: 'Ready to Die', description: 'The Notorious B.I.G.\'s groundbreaking debut', wikipedia_url: 'https://en.wikipedia.org/wiki/Ready_to_Die' },
    { title: 'The Miseducation of Lauryn Hill', description: 'Lauryn Hill\'s genre-blending classic', wikipedia_url: 'https://en.wikipedia.org/wiki/The_Miseducation_of_Lauryn_Hill' },
    { title: 'good kid, m.A.A.d city', description: 'Kendrick Lamar\'s Compton coming-of-age story', wikipedia_url: 'https://en.wikipedia.org/wiki/Good_Kid,_M.A.A.D_City' },
  ],
  tags: ['hip-hop', 'rap', 'albums'],
  icon: '🎤',
};

// ─────────────────────────────────────────────────────────────
// Sports Templates
// ─────────────────────────────────────────────────────────────

const NBA_PLAYERS: ListTemplate = {
  id: 'tpl-nba-players',
  name: 'Greatest NBA Players',
  description: 'The best basketball players in NBA history',
  category: 'Sports',
  topic: 'Greatest NBA Players of All Time',
  listSize: 20,
  generateCount: 30,
  criteriaProfileId: 'template-sports',
  starterItems: [
    { title: 'Michael Jordan', description: '6x NBA champion, 5x MVP with the Chicago Bulls', wikipedia_url: 'https://en.wikipedia.org/wiki/Michael_Jordan' },
    { title: 'LeBron James', description: 'All-time leading scorer, 4x NBA champion', wikipedia_url: 'https://en.wikipedia.org/wiki/LeBron_James' },
    { title: 'Kareem Abdul-Jabbar', description: '6x NBA champion, all-time skyhook master', wikipedia_url: 'https://en.wikipedia.org/wiki/Kareem_Abdul-Jabbar' },
    { title: 'Magic Johnson', description: 'Revolutionary point guard, 5x NBA champion', wikipedia_url: 'https://en.wikipedia.org/wiki/Magic_Johnson' },
    { title: 'Larry Bird', description: '3x NBA champion, 3x consecutive MVP', wikipedia_url: 'https://en.wikipedia.org/wiki/Larry_Bird' },
  ],
  tags: ['basketball', 'nba', 'athletes'],
  icon: '🏀',
};

const SOCCER_PLAYERS: ListTemplate = {
  id: 'tpl-soccer-players',
  name: 'Greatest Soccer Players',
  description: 'The best football/soccer players in history',
  category: 'Sports',
  topic: 'Greatest Soccer Players of All Time',
  listSize: 20,
  generateCount: 30,
  criteriaProfileId: 'template-sports',
  starterItems: [
    { title: 'Pelé', description: '3x World Cup winner, the king of football', wikipedia_url: 'https://en.wikipedia.org/wiki/Pel%C3%A9' },
    { title: 'Diego Maradona', description: 'Argentine legend, Hand of God, 1986 World Cup hero', wikipedia_url: 'https://en.wikipedia.org/wiki/Diego_Maradona' },
    { title: 'Lionel Messi', description: '8x Ballon d\'Or winner, 2022 World Cup champion', wikipedia_url: 'https://en.wikipedia.org/wiki/Lionel_Messi' },
    { title: 'Cristiano Ronaldo', description: 'All-time international top scorer, 5x Champions League winner', wikipedia_url: 'https://en.wikipedia.org/wiki/Cristiano_Ronaldo' },
    { title: 'Johan Cruyff', description: 'Pioneer of Total Football, 3x Ballon d\'Or', wikipedia_url: 'https://en.wikipedia.org/wiki/Johan_Cruyff' },
  ],
  tags: ['soccer', 'football', 'athletes'],
  icon: '⚽',
};

// ─────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────

export const ALL_LIST_TEMPLATES: ListTemplate[] = [
  HORROR_GAMES,
  RPG_GAMES,
  INDIE_GAMES,
  SCI_FI_MOVIES,
  ANIMATED_MOVIES,
  TOP_ANIME,
  ALBUMS_BY_GENRE,
  HIP_HOP_ALBUMS,
  NBA_PLAYERS,
  SOCCER_PLAYERS,
];

/** Get templates filtered by category (or all if no category specified) */
export function getTemplatesByCategory(category?: string): ListTemplate[] {
  if (!category) return ALL_LIST_TEMPLATES;
  return ALL_LIST_TEMPLATES.filter((t) => t.category === category);
}

/** Get a template by its ID */
export function getListTemplateById(id: string): ListTemplate | undefined {
  return ALL_LIST_TEMPLATES.find((t) => t.id === id);
}

/** Get all unique categories that have templates */
export function getTemplateCategoryTags(): string[] {
  return Array.from(new Set(ALL_LIST_TEMPLATES.map((t) => t.category)));
}

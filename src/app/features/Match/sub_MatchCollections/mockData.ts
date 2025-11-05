/**
 * Mock data for testing drag and drop
 */

import { CollectionGroup } from './types';

export const MOCK_COLLECTIONS: CollectionGroup[] = [
  {
    id: 'group-1',
    name: 'Action Movies',
    items: [
      { id: 'item-1', title: 'The Matrix', image_url: 'https://via.placeholder.com/150/0000FF/FFFFFF?text=Matrix' },
      { id: 'item-2', title: 'Die Hard', image_url: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=Die+Hard' },
      { id: 'item-3', title: 'John Wick', image_url: 'https://via.placeholder.com/150/00FF00/FFFFFF?text=John+Wick' },
      { id: 'item-4', title: 'Mad Max', image_url: 'https://via.placeholder.com/150/FFFF00/000000?text=Mad+Max' },
      { id: 'item-5', title: 'Terminator', image_url: 'https://via.placeholder.com/150/FF00FF/FFFFFF?text=Terminator' },
    ]
  },
  {
    id: 'group-2',
    name: 'Sci-Fi Movies',
    items: [
      { id: 'item-6', title: 'Blade Runner', image_url: 'https://via.placeholder.com/150/00FFFF/000000?text=Blade+Runner' },
      { id: 'item-7', title: 'Interstellar', image_url: 'https://via.placeholder.com/150/FFA500/FFFFFF?text=Interstellar' },
      { id: 'item-8', title: 'Inception', image_url: 'https://via.placeholder.com/150/800080/FFFFFF?text=Inception' },
      { id: 'item-9', title: 'Arrival', image_url: 'https://via.placeholder.com/150/008080/FFFFFF?text=Arrival' },
      { id: 'item-10', title: 'Ex Machina', image_url: 'https://via.placeholder.com/150/808080/FFFFFF?text=Ex+Machina' },
    ]
  },
  {
    id: 'group-3',
    name: 'Drama Movies',
    items: [
      { id: 'item-11', title: 'Shawshank Redemption', image_url: 'https://via.placeholder.com/150/4B0082/FFFFFF?text=Shawshank' },
      { id: 'item-12', title: 'Forrest Gump', image_url: 'https://via.placeholder.com/150/FF1493/FFFFFF?text=Forrest' },
      { id: 'item-13', title: 'The Godfather', image_url: 'https://via.placeholder.com/150/8B4513/FFFFFF?text=Godfather' },
      { id: 'item-14', title: 'Pulp Fiction', image_url: 'https://via.placeholder.com/150/DC143C/FFFFFF?text=Pulp' },
      { id: 'item-15', title: 'Fight Club', image_url: 'https://via.placeholder.com/150/2F4F4F/FFFFFF?text=Fight+Club' },
    ]
  }
];

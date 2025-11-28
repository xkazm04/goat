/**
 * Demo Content for Swipeable Cards
 * Example items to demonstrate the particle theme system
 */

// Demo card dimensions
const DEMO_CARD_WIDTH = 320; // w-80 = 20rem = 320px
const DEMO_CARD_HEIGHT = 480;
const DEMO_IMAGE_HEIGHT = 256; // h-64 = 16rem = 256px

// Placeholder image configuration
const PLACEHOLDER_WIDTH = 300;
const PLACEHOLDER_HEIGHT = 400;
const PLACEHOLDER_BG_DARK = '1a1a1a';
const PLACEHOLDER_BG_ALT = '2a2a2a';
const PLACEHOLDER_TEXT_COLOR = 'ffffff';

function createPlaceholderUrl(text: string, bgColor: string = PLACEHOLDER_BG_DARK): string {
  const encodedText = text.replace(/ /g, '+');
  return `https://via.placeholder.com/${PLACEHOLDER_WIDTH}x${PLACEHOLDER_HEIGHT}/${bgColor}/${PLACEHOLDER_TEXT_COLOR}?text=${encodedText}`;
}

export const DEMO_ITEMS = [
  {
    id: 'demo-1',
    title: 'The Godfather',
    subtitle: 'Classic Crime Drama',
    imageUrl: createPlaceholderUrl('The Godfather', PLACEHOLDER_BG_DARK),
  },
  {
    id: 'demo-2',
    title: 'Pulp Fiction',
    subtitle: 'Tarantino Masterpiece',
    imageUrl: createPlaceholderUrl('Pulp Fiction', PLACEHOLDER_BG_ALT),
  },
  {
    id: 'demo-3',
    title: 'The Dark Knight',
    subtitle: 'Superhero Thriller',
    imageUrl: createPlaceholderUrl('Dark Knight', PLACEHOLDER_BG_DARK),
  },
  {
    id: 'demo-4',
    title: 'Inception',
    subtitle: 'Mind-Bending Sci-Fi',
    imageUrl: createPlaceholderUrl('Inception', PLACEHOLDER_BG_ALT),
  },
  {
    id: 'demo-5',
    title: 'Forrest Gump',
    subtitle: 'Heartwarming Drama',
    imageUrl: createPlaceholderUrl('Forrest Gump', PLACEHOLDER_BG_DARK),
  },
];

export interface DemoCardProps {
  title: string;
  subtitle: string;
  imageUrl: string;
}

export function DemoCard({ title, subtitle, imageUrl }: DemoCardProps) {
  return (
    <div className="w-80 h-[480px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
      {/* Image */}
      <div className="h-64 bg-gray-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-6xl">🎬</div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 mb-4">{subtitle}</p>

        <div className="flex gap-2 mb-4">
          <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full text-xs text-purple-300">
            Drama
          </div>
          <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded-full text-xs text-blue-300">
            Classic
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <span>⭐</span>
            <span>9.2/10</span>
          </div>
          <span>1972</span>
        </div>
      </div>
    </div>
  );
}

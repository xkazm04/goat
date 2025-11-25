/**
 * Demo Content for Swipeable Cards
 * Example items to demonstrate the particle theme system
 */

export const DEMO_ITEMS = [
  {
    id: 'demo-1',
    title: 'The Godfather',
    subtitle: 'Classic Crime Drama',
    imageUrl: 'https://via.placeholder.com/300x400/1a1a1a/ffffff?text=The+Godfather',
  },
  {
    id: 'demo-2',
    title: 'Pulp Fiction',
    subtitle: 'Tarantino Masterpiece',
    imageUrl: 'https://via.placeholder.com/300x400/2a2a2a/ffffff?text=Pulp+Fiction',
  },
  {
    id: 'demo-3',
    title: 'The Dark Knight',
    subtitle: 'Superhero Thriller',
    imageUrl: 'https://via.placeholder.com/300x400/1a1a1a/ffffff?text=Dark+Knight',
  },
  {
    id: 'demo-4',
    title: 'Inception',
    subtitle: 'Mind-Bending Sci-Fi',
    imageUrl: 'https://via.placeholder.com/300x400/2a2a2a/ffffff?text=Inception',
  },
  {
    id: 'demo-5',
    title: 'Forrest Gump',
    subtitle: 'Heartwarming Drama',
    imageUrl: 'https://via.placeholder.com/300x400/1a1a1a/ffffff?text=Forrest+Gump',
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

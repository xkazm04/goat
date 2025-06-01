'use client';

import { useState } from 'react';

const categories = [
  {
    id: 'sports',
    title: 'Sports',
    icon: '🏆',
    description: 'Athletes, teams, and legendary moments that defined sports history',
    gradient: ['var(--primary-500)', 'var(--primary-600)'],
    examples: ['Michael Jordan', 'Serena Williams', 'Tom Brady', 'Messi']
  },
  {
    id: 'music',
    title: 'Music',
    icon: '🎵',
    description: 'Artists, albums, and songs that shaped the soundtrack of our lives',
    gradient: ['var(--verified)', 'var(--verified-light)'],
    examples: ['The Beatles', 'Michael Jackson', 'Beyoncé', 'Drake']
  },
  {
    id: 'gaming',
    title: 'Gaming',
    icon: '🎮',
    description: 'Games, characters, and moments that revolutionized interactive entertainment',
    gradient: ['var(--unverified)', 'var(--unverified-light)'],
    examples: ['Super Mario Bros', 'The Legend of Zelda', 'Minecraft', 'Fortnite']
  }
];

export const LandingCategories = () => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <section className="py-32 px-6 bg-muted">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Choose Your
            <span className="block mt-2 text-primary">
              Arena
            </span>
          </h2>
          <p className="text-xl max-w-3xl mx-auto leading-relaxed text-muted-foreground">
            Every legend has their domain. Pick your battlefield and start building 
            your definitive Top 50 list that will challenge the world's perspective.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className="group relative cursor-pointer"
              onMouseEnter={() => setHoveredCard(category.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                animationDelay: `${index * 200}ms`,
              }}
            >
              <div 
                className="relative h-96 rounded-3xl p-8 transition-all duration-500 transform group-hover:scale-105 group-hover:-translate-y-4 bg-card border border-border shadow-lg"
                style={{
                  background: hoveredCard === category.id 
                    ? `linear-gradient(135deg, ${category.gradient[0]}, ${category.gradient[1]})`
                    : undefined,
                  boxShadow: hoveredCard === category.id 
                    ? `0 20px 60px ${category.gradient[0]}40`
                    : undefined,
                }}
              >
                {/* Background Pattern */}
                <div 
                  className="absolute inset-0 rounded-3xl opacity-10"
                  style={{
                    backgroundImage: `radial-gradient(circle at 70% 30%, ${category.gradient[0]} 1px, transparent 1px)`,
                    backgroundSize: '20px 20px'
                  }}
                />

                {/* Content */}
                <div className="relative h-full flex flex-col">
                  {/* Icon */}
                  <div className="text-6xl mb-6 transform transition-transform group-hover:scale-110">
                    {category.icon}
                  </div>

                  {/* Title */}
                  <h3 
                    className={`text-3xl font-bold mb-4 ${
                      hoveredCard === category.id ? 'text-white' : 'text-foreground'
                    }`}
                  >
                    {category.title}
                  </h3>

                  {/* Description */}
                  <p 
                    className={`text-base leading-relaxed mb-6 flex-grow ${
                      hoveredCard === category.id ? 'text-white/90' : 'text-muted-foreground'
                    }`}
                  >
                    {category.description}
                  </p>

                  {/* Examples */}
                  <div className="space-y-2">
                    <p 
                      className={`text-sm font-semibold ${
                        hoveredCard === category.id ? 'text-white/80' : 'text-muted-foreground'
                      }`}
                    >
                      Featured Legends:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {category.examples.map((example, idx) => (
                        <span
                          key={idx}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            hoveredCard === category.id 
                              ? 'bg-white/20 text-white' 
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {example}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
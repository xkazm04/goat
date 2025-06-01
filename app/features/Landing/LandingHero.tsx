'use client';

import GlowingText from "@/app/components/GlowingText";

export const LandingHero = () => {

  return (
    <section 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%,  2px, transparent 2px),
                             radial-gradient(circle at 75% 75%, 1px, transparent 1px)`,
            backgroundSize: '60px 60px, 40px 40px'
          }} 
        />
      </div>


      <div className="relative z-10 text-center max-w-6xl mx-auto px-6">
        {/* Main Title */}
        <div className="mb-8">
          <h1 
            className="text-8xl text-yellow-300 md:text-9xl font-black tracking-tight mb-4">
            G.O.A.T. 
          </h1>
          
          <div className="flex items-center justify-center gap-4 mb-6">
            <div 
              className="h-px flex-1"
            />
            <span 
              className="text-xl font-semibold tracking-wider"
            >
              GREATEST OF ALL TIME
            </span>
            <div 
              className="h-px flex-1"
            />
          </div>
        </div>

        {/* Subtitle */}
        <div className="mb-12 max-w-3xl mx-auto">
          <p 
            className="text-xl md:text-2xl leading-relaxed mb-4"
          >
            Unleash the power of AI-driven storytelling and fact-checking
          </p>
          <p 
            className="text-lg opacity-80"
          >
            Transform your content creation with intelligent analysis and verification
          </p>
        </div>
      </div>
    </section>
  );
};
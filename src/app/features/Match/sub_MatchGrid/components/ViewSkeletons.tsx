"use client";

/**
 * Lightweight loading skeletons for lazy-loaded view components.
 * Each skeleton matches the layout dimensions of its real component
 * to prevent layout shift during chunk loading.
 */

const pulseClass = "animate-pulse bg-white/5 rounded-xl";

export function PodiumViewSkeleton() {
  return (
    <div className="mb-16 relative py-8">
      <div className="flex justify-center items-end gap-0 pt-16">
        {/* 2nd place */}
        <div className="flex flex-col items-center">
          <div className={`w-32 h-32 md:w-40 md:h-40 lg:w-44 lg:h-44 ${pulseClass}`} />
          <div className="w-40 md:w-48 lg:w-56 h-28 bg-white/[0.03] rounded-t-lg mt-0" />
        </div>
        {/* 1st place */}
        <div className="flex flex-col items-center z-20">
          <div className={`w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 ${pulseClass}`} />
          <div className="w-48 md:w-56 lg:w-64 h-[180px] bg-white/[0.03] rounded-t-lg mt-0" />
        </div>
        {/* 3rd place */}
        <div className="flex flex-col items-center">
          <div className={`w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 ${pulseClass}`} />
          <div className="w-36 md:w-44 lg:w-52 h-[76px] bg-white/[0.03] rounded-t-lg mt-0" />
        </div>
      </div>
    </div>
  );
}

export function GoatViewSkeleton() {
  return (
    <div className="mb-16 relative">
      <div className="flex flex-col items-center gap-6">
        {/* GOAT Badge placeholder */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded bg-white/5" />
          <div className="h-9 w-48 rounded bg-white/5" />
          <div className="w-8 h-8 rounded bg-white/5" />
        </div>
        {/* Main circle */}
        <div className={`w-96 h-96 rounded-full ${pulseClass}`} />
        {/* Description placeholder */}
        <div className="h-4 w-40 rounded bg-white/5" />
      </div>
    </div>
  );
}

export function MountRushmoreViewSkeleton() {
  return (
    <div className="mb-16 relative">
      <div className="flex flex-col items-center gap-8">
        {/* Header placeholder */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-7 h-7 rounded bg-white/5" />
          <div className="h-9 w-56 rounded bg-white/5" />
          <div className="w-7 h-7 rounded bg-white/5" />
        </div>
        <div className="h-3 w-48 rounded bg-white/5 mb-4" />
        {/* 4 face grid */}
        <div className="grid grid-cols-4 gap-8 w-full max-w-6xl px-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`aspect-square ${pulseClass}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

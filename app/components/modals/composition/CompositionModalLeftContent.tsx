"use client";

interface CompositionModalLeftContentProps {
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  timePeriod: "all-time" | "decade" | "year";
  setTimePeriod: (period: "all-time" | "decade" | "year") => void;
  selectedDecade: number;
  setSelectedDecade: (decade: number) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  hierarchy: string;
  setHierarchy: (hierarchy: string) => void;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const categories = ["Sports", "Music", "Games", "Stories"];
const hierarchyOptions = ["Top 10", "Top 20", "Top 50"];

export function CompositionModalLeftContent({
  selectedCategory,
  setSelectedCategory,
  timePeriod,
  setTimePeriod,
  selectedDecade,
  setSelectedDecade,
  selectedYear,
  setSelectedYear,
  hierarchy,
  setHierarchy,
  color
}: CompositionModalLeftContentProps) {
  return (
    <div 
      className="p-8 border-r"
      style={{
        borderColor: `${color.primary}20`,
        background: `
          linear-gradient(135deg, 
            rgba(15, 23, 42, 0.7) 0%,
            rgba(30, 41, 59, 0.8) 100%
          )
        `
      }}
    >
      <h3 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-2">
        <div 
          className="w-2 h-2 rounded-full"
          style={{ background: color.accent }}
        />
        Configuration
      </h3>

      {/* Category Selection */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Category
        </label>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`p-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                selectedCategory === category 
                  ? 'text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={selectedCategory === category ? {
                background: `linear-gradient(135deg, ${color.primary}80, ${color.secondary}80)`,
                boxShadow: `0 2px 8px ${color.primary}30`
              } : {
                background: 'rgba(51, 65, 85, 0.3)',
                border: '1px solid rgba(71, 85, 105, 0.3)'
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Time Period */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Time Period
        </label>
        <div className="space-y-3">
          {/* Time Period Toggle */}
          <div className="flex gap-2">
            {[
              { value: "all-time", label: "All Time" },
              { value: "decade", label: "By Decade" },
              { value: "year", label: "By Year" }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimePeriod(option.value as any)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  timePeriod === option.value 
                    ? 'text-white' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={timePeriod === option.value ? {
                  background: `linear-gradient(135deg, ${color.primary}60, ${color.secondary}60)`,
                } : {
                  background: 'rgba(51, 65, 85, 0.3)',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Decade Slider */}
          {timePeriod === "decade" && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">1980s</span>
                <span 
                  className="text-sm font-bold"
                  style={{ color: color.accent }}
                >
                  {selectedDecade}s
                </span>
                <span className="text-xs text-slate-400">2020s</span>
              </div>
              <input
                type="range"
                min={1980}
                max={2020}
                step={10}
                value={selectedDecade}
                onChange={(e) => setSelectedDecade(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${color.primary}40, ${color.secondary}40)`,
                }}
              />
            </div>
          )}

          {/* Year Input */}
          {timePeriod === "year" && (
            <div className="mt-4">
              <input
                type="number"
                min={2000}
                max={2025}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl text-slate-200 transition-all duration-200 focus:outline-none"
                style={{
                  background: `
                    linear-gradient(135deg, 
                      rgba(30, 41, 59, 0.9) 0%,
                      rgba(51, 65, 85, 0.95) 100%
                    )
                  `,
                  border: `2px solid ${color.primary}40`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Hierarchy Selection */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          List Size
        </label>
        <div className="flex gap-2">
          {hierarchyOptions.map((option) => (
            <button
              key={option}
              onClick={() => setHierarchy(option)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                hierarchy === option 
                  ? 'text-white' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              style={hierarchy === option ? {
                background: `linear-gradient(135deg, ${color.primary}80, ${color.secondary}80)`,
              } : {
                background: 'rgba(51, 65, 85, 0.3)',
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
import { Search } from "lucide-react";

type Props = {
    matchedItems: number;
    totalItems: number;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}

const BacklogGroupsHeader = ({matchedItems, totalItems, searchTerm, setSearchTerm}: Props) => {
    return       <div 
        className="relative px-8 py-6 border-b"
        style={{
          borderImage: 'linear-gradient(90deg, transparent, rgba(71, 85, 105, 0.5), transparent) 1',
          background: `
            linear-gradient(135deg, 
              rgba(30, 41, 59, 0.8) 0%,
              rgba(51, 65, 85, 0.9) 100%
            )
          `
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div 
            className="relative px-4 py-2 rounded-full text-sm font-bold tracking-wide"
            style={{
              background: `
                linear-gradient(135deg, 
                  rgba(59, 130, 246, 0.2) 0%,
                  rgba(147, 51, 234, 0.2) 100%
                )
              `,
              border: '1px solid rgba(59, 130, 246, 0.4)',
              backdropFilter: 'blur(8px)',
              color: '#93c5fd'
            }}
          >
            <span className="relative z-10">{matchedItems}</span>
            <span className="opacity-60 mx-1">/</span>
            <span className="opacity-80">{totalItems}</span>
            <div 
              className="absolute inset-0 rounded-full opacity-20"
              style={{
                background: `
                  radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.5) 0%, transparent 50%)
                `
              }}
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative group">
          <div 
            className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-all duration-300"
            style={{
              background: `
                linear-gradient(135deg, 
                  rgba(59, 130, 246, 0.1) 0%,
                  rgba(147, 51, 234, 0.1) 100%
                )
              `,
              transform: 'scale(1.02)'
            }}
          />
          <div className="relative">
            <Search 
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors duration-200"
            />
            <input
              type="text"
              placeholder="Search legends..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none relative z-10 text-slate-200 placeholder:text-slate-500"
              style={{
                background: `
                  linear-gradient(135deg, 
                    rgba(30, 41, 59, 0.9) 0%,
                    rgba(51, 65, 85, 0.95) 100%
                  )
                `,
                border: '1.5px solid rgba(71, 85, 105, 0.4)',
                backdropFilter: 'blur(8px)',
                boxShadow: `
                  0 1px 3px 0 rgba(0, 0, 0, 0.3),
                  inset 0 1px 0 rgba(148, 163, 184, 0.1)
                `
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(59, 130, 246, 0.6)';
                e.target.style.boxShadow = `
                  0 0 0 3px rgba(59, 130, 246, 0.2),
                  0 4px 6px -1px rgba(0, 0, 0, 0.3),
                  inset 0 1px 0 rgba(148, 163, 184, 0.1)
                `;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(71, 85, 105, 0.4)';
                e.target.style.boxShadow = `
                  0 1px 3px 0 rgba(0, 0, 0, 0.3),
                  inset 0 1px 0 rgba(148, 163, 184, 0.1)
                `;
              }}
            />
          </div>
        </div>
      </div>
}

export default BacklogGroupsHeader;
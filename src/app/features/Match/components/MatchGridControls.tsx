import { Grid3X3, LayoutGrid, ChevronDown } from "lucide-react";
import { AddingMode } from "../MatchGrid";

type MatchGridControlsProps = {
    addingMode: AddingMode;
    setAddingMode: (mode: AddingMode) => void;
    maxItems: number;
    setMaxItems: (count: number) => void;
    viewMode: 'standard' | 'podium';
    setViewMode: (mode: 'standard' | 'podium') => void;
    filteredGridItems: { matched: boolean }[];
}

/**
 * Shared controls for the Match Grid, including:
 * - Adding Mode selector (start/anywhere/end)
 * - Max Items selector (Top 10/20/50)
 * - View Mode toggle (standard/podium)
 * - Items Count Badge
 */
export function MatchGridControls({
    addingMode,
    setAddingMode,
    maxItems,
    setMaxItems,
    viewMode,
    setViewMode,
    filteredGridItems
}: MatchGridControlsProps) {
    return (
        <>
            {/* Adding Mode Controls */}
            <AddingModeControls
                addingMode={addingMode}
                setAddingMode={setAddingMode}
            />

            <div className="flex items-center gap-3">
                {/* Items Count Selector */}
                <MaxItemsSelector
                    maxItems={maxItems}
                    setMaxItems={setMaxItems}
                />

                {/* View Mode Toggle */}
                <ViewModeToggle
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                />

                {/* Items Count Badge */}
                <ItemCountBadge
                    filteredGridItems={filteredGridItems}
                    maxItems={maxItems}
                />
            </div>
        </>
    );
}

type AddingModeControlsProps = {
    addingMode: AddingMode;
    setAddingMode: (mode: AddingMode) => void;
}

function AddingModeControls({ addingMode, setAddingMode }: AddingModeControlsProps) {
    return (
        <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 font-medium mr-2 uppercase tracking-wider">
                Adding Mode
            </span>
            {(['start', 'anywhere', 'end'] as AddingMode[]).map((mode) => (
                <button
                    key={mode}
                    onClick={() => setAddingMode(mode)}
                    data-testid={`adding-mode-${mode}-btn`}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                        addingMode === mode
                            ? 'text-white shadow-lg'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                    style={addingMode === mode ? {
                        background: `
                            linear-gradient(135deg,
                              rgba(59, 130, 246, 0.8) 0%,
                              rgba(147, 51, 234, 0.8) 100%
                            )
                        `,
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                    } : {
                        background: 'rgba(51, 65, 85, 0.3)',
                        border: '1px solid rgba(71, 85, 105, 0.3)'
                    }}
                >
                    {mode === 'start' && 'From Start'}
                    {mode === 'anywhere' && 'Anywhere'}
                    {mode === 'end' && 'From End'}
                </button>
            ))}
        </div>
    );
}

type MaxItemsSelectorProps = {
    maxItems: number;
    setMaxItems: (count: number) => void;
}

function MaxItemsSelector({ maxItems, setMaxItems }: MaxItemsSelectorProps) {
    return (
        <div className="relative">
            <select
                value={maxItems}
                onChange={(e) => setMaxItems(Number(e.target.value))}
                data-testid="max-items-select"
                className="appearance-none pr-8 pl-3 py-2 text-sm font-semibold rounded-lg cursor-pointer transition-all duration-200 focus:outline-none text-slate-200"
                style={{
                    background: `
                        linear-gradient(135deg,
                          rgba(30, 41, 59, 0.9) 0%,
                          rgba(51, 65, 85, 0.95) 100%
                        )
                    `,
                    border: '1.5px solid rgba(71, 85, 105, 0.4)',
                    boxShadow: `
                        0 2px 4px rgba(0, 0, 0, 0.2),
                        inset 0 1px 0 rgba(148, 163, 184, 0.1)
                    `
                }}
                onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.6)';
                    e.target.style.boxShadow = `
                        0 0 0 3px rgba(59, 130, 246, 0.2),
                        0 2px 4px rgba(0, 0, 0, 0.2),
                        inset 0 1px 0 rgba(148, 163, 184, 0.1)
                    `;
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(71, 85, 105, 0.4)';
                    e.target.style.boxShadow = `
                        0 2px 4px rgba(0, 0, 0, 0.2),
                        inset 0 1px 0 rgba(148, 163, 184, 0.1)
                    `;
                }}
            >
                <option value={10} className="bg-slate-800 text-slate-200">Top 10</option>
                <option value={20} className="bg-slate-800 text-slate-200">Top 20</option>
                <option value={50} className="bg-slate-800 text-slate-200">Top 50</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
    );
}

type ViewModeToggleProps = {
    viewMode: 'standard' | 'podium';
    setViewMode: (mode: 'standard' | 'podium') => void;
}

function ViewModeToggle({ viewMode, setViewMode }: ViewModeToggleProps) {
    return (
        <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{
                border: '1px solid rgba(71, 85, 105, 0.4)',
                background: 'rgba(30, 41, 59, 0.5)'
            }}
        >
            <button
                onClick={() => setViewMode('standard')}
                data-testid="view-mode-standard-btn"
                className={`p-2 transition-all duration-200 ${
                    viewMode === 'standard'
                        ? 'text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                }`}
                style={viewMode === 'standard' ? {
                    background: `
                        linear-gradient(135deg,
                          rgba(59, 130, 246, 0.8) 0%,
                          rgba(147, 51, 234, 0.8) 100%
                        )
                    `
                } : {}}
                title="Standard Grid View"
            >
                <Grid3X3 className="w-4 h-4" />
            </button>
            <button
                onClick={() => setViewMode('podium')}
                data-testid="view-mode-podium-btn"
                className={`p-2 transition-all duration-200 ${
                    viewMode === 'podium'
                        ? 'text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                }`}
                style={viewMode === 'podium' ? {
                    background: `
                        linear-gradient(135deg,
                          rgba(59, 130, 246, 0.8) 0%,
                          rgba(147, 51, 234, 0.8) 100%
                        )
                    `
                } : {}}
                title="Podium View"
            >
                <LayoutGrid className="w-4 h-4" />
            </button>
        </div>
    );
}

type ItemCountBadgeProps = {
    filteredGridItems: { matched: boolean }[];
    maxItems: number;
}

function ItemCountBadge({ filteredGridItems, maxItems }: ItemCountBadgeProps) {
    return (
        <div
            className="px-4 py-2 rounded-full text-sm font-bold tracking-wide"
            data-testid="item-count-badge"
            style={{
                background: `
                    linear-gradient(135deg,
                      rgba(59, 130, 246, 0.2) 0%,
                      rgba(147, 51, 234, 0.2) 100%
                    )
                `,
                border: '1px solid rgba(59, 130, 246, 0.4)',
                color: '#93c5fd'
            }}
        >
            <span className="relative z-10">{filteredGridItems.filter(item => item.matched).length}</span>
            <span className="opacity-60 mx-1">/</span>
            <span className="opacity-80">{maxItems}</span>
        </div>
    );
}

export type { MatchGridControlsProps };

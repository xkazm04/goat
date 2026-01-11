import { Trophy } from "lucide-react";
import { AddingMode } from "./MatchGrid";
import { MatchGridControls } from "./components/MatchGridControls";

type Props = {
    maxItems: number;
    selectedBacklogItem: string | null;
    addingMode: AddingMode;
    setAddingMode: (mode: AddingMode) => void;
    setMaxItems: (count: number) => void;
    viewMode: 'standard' | 'podium';
    setViewMode: (mode: 'standard' | 'podium') => void;
    filteredGridItems: { matched: boolean }[];
}

const MatchGridToolbar = ({
    maxItems,
    selectedBacklogItem,
    addingMode,
    setAddingMode,
    setMaxItems,
    viewMode,
    setViewMode,
    filteredGridItems
}: Props) => {
    return (
        <div
            className="px-6 py-4 border-b"
            data-testid="match-grid-toolbar"
            style={{
                borderColor: 'rgba(71, 85, 105, 0.5)',
                background: `
                    linear-gradient(135deg,
                      rgba(30, 41, 59, 0.8) 0%,
                      rgba(51, 65, 85, 0.9) 100%
                    )
                `
            }}
        >
            <div className="flex items-center justify-between">
                {/* Trophy Header - Unique to Toolbar */}
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                            background: `
                                linear-gradient(135deg,
                                  #4c1d95 0%,
                                  #7c3aed 50%,
                                  #3b82f6 100%
                                )
                            `,
                            boxShadow: `
                                0 4px 14px 0 rgba(124, 58, 237, 0.4),
                                inset 0 1px 0 rgba(255, 255, 255, 0.2)
                            `
                        }}
                    >
                        <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2
                            className="text-xl font-black tracking-tight"
                            style={{
                                background: `
                                    linear-gradient(135deg,
                                      #f1f5f9 0%,
                                      #cbd5e1 50%,
                                      #f8fafc 100%
                                    )
                                `,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                            }}
                        >
                            Top {maxItems} Rankings
                        </h2>
                        <p className="text-sm text-slate-400 font-medium">
                            {selectedBacklogItem ? 'Click a position to assign' : 'Drag to reorder or click to remove'}
                        </p>
                    </div>
                </div>

                {/* Shared Controls */}
                <MatchGridControls
                    addingMode={addingMode}
                    setAddingMode={setAddingMode}
                    maxItems={maxItems}
                    setMaxItems={setMaxItems}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    filteredGridItems={filteredGridItems}
                />
            </div>
        </div>
    );
}

export default MatchGridToolbar;

import { AddingMode } from "./MatchGrid";
import { MatchGridControls } from "./components/MatchGridControls";

type Props = {
    addingMode: AddingMode;
    setAddingMode: (mode: AddingMode) => void;
    maxItems: number;
    setMaxItems: (count: number) => void;
    viewMode: 'standard' | 'podium';
    setViewMode: (mode: 'standard' | 'podium') => void;
    filteredGridItems: { matched: boolean }[];
}

const MatchGridHeader = ({
    addingMode,
    setAddingMode,
    maxItems,
    setMaxItems,
    viewMode,
    setViewMode,
    filteredGridItems
}: Props) => {
    return (
        <div
            className="px-6 py-4 border-b"
            data-testid="match-grid-header"
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

export default MatchGridHeader;

export const getProgressLineStyles = (isLeft: boolean, isCompleted: boolean, progressPercentage:number) => {
    if (isCompleted) {
        return {
            background: isLeft
                ? `linear-gradient(90deg, transparent 0%, #10b981 30%, #34d399 70%, #6ee7b7 100%)`
                : `linear-gradient(90deg, #6ee7b7 0%, #34d399 30%, #10b981 70%, transparent 100%)`,
            boxShadow: `
                    0 0 20px rgba(16, 185, 129, 0.8),
                    0 0 40px rgba(52, 211, 153, 0.6),
                    0 0 60px rgba(110, 231, 183, 0.4)
                `,
            filter: 'brightness(1.3)'
        };
    }

    return {
        background: isLeft
            ? `linear-gradient(90deg, transparent 0%, #10b981 30%, #f59e0b 70%, #fbbf24 100%)`
            : `linear-gradient(90deg, #fbbf24 0%, #f59e0b 30%, #10b981 70%, transparent 100%)`,
        boxShadow: progressPercentage > 0 ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
    };
};

export const getCenterTextStyles = (isCompleted: boolean) => {
    if (isCompleted) {
        return {
            background: `
                    linear-gradient(135deg, 
                        rgba(16, 185, 129, 0.3) 0%,
                        rgba(52, 211, 153, 0.2) 50%,
                        rgba(110, 231, 183, 0.3) 100%
                    )
                `,
            border: '2px solid rgba(16, 185, 129, 0.8)',
            color: '#10b981',
            textShadow: `
                    0 0 10px rgba(16, 185, 129, 0.8),
                    0 0 20px rgba(52, 211, 153, 0.6)
                `,
            boxShadow: `
                    0 4px 20px rgba(16, 185, 129, 0.4),
                    0 0 40px rgba(52, 211, 153, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2)
                `,
            cursor: 'pointer'
        };
    }

    return {
        background: `
                linear-gradient(135deg, 
                    rgba(251, 191, 36, 0.1) 0%,
                    rgba(245, 158, 11, 0.05) 50%,
                    rgba(217, 119, 6, 0.1) 100%
                )
            `,
        border: '1px solid rgba(251, 191, 36, 0.3)',
        color: '#fbbf24',
        textShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
        boxShadow: `
                0 4px 20px rgba(251, 191, 36, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `
    };
};

import { motion } from 'framer-motion';

type Props = {
    action: {
        icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
        label: string;
        description: string;
        onClick: () => void;
        color: string;
        special?: 'twitter';
        disabled?: boolean;
    };
    index: number;
}

const CompletionModalActionButton = ({action, index}: Props) => {
    return <motion.button
        key={action.label}
        className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 ${action.disabled ? 'cursor-not-allowed opacity-50' : ''
            }`}
        style={{
            background: action.special === 'twitter'
                ? `linear-gradient(135deg, 
                      rgba(29, 161, 242, 0.2) 0%,
                      rgba(29, 161, 242, 0.1) 100%
                    )`
                : `linear-gradient(135deg, 
                      rgba(30, 41, 59, 0.6) 0%,
                      rgba(51, 65, 85, 0.8) 100%
                    )`,
            border: action.special === 'twitter'
                ? '1px solid rgba(29, 161, 242, 0.4)'
                : `1px solid ${action.color}40`
        }}
        whileHover={!action.disabled ? {
            scale: 1.05,
            boxShadow: action.special === 'twitter'
                ? '0 4px 20px rgba(29, 161, 242, 0.3)'
                : `0 4px 20px ${action.color}30`,
            background: action.special === 'twitter'
                ? `linear-gradient(135deg, 
                      rgba(29, 161, 242, 0.3) 0%,
                      rgba(29, 161, 242, 0.2) 100%
                    )`
                : `linear-gradient(135deg, 
                      ${action.color}20 0%,
                      ${action.color}10 100%
                    )`
        } : {}}
        whileTap={!action.disabled ? { scale: 0.95 } : {}}
        onClick={action.disabled ? undefined : action.onClick}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.7 + index * 0.1 }}
        disabled={action.disabled}
    >
        <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${action.disabled ? 'opacity-50' : ''
                }`}
            style={{
                background: action.special === 'twitter'
                    ? 'rgba(29, 161, 242, 0.2)'
                    : `${action.color}20`,
                border: action.special === 'twitter'
                    ? '1px solid rgba(29, 161, 242, 0.4)'
                    : `1px solid ${action.color}40`
            }}
        >
            <action.icon
                className={`w-4 h-4 ${action.disabled && action.label === 'Export' ? 'animate-pulse' : ''
                    }`}
                style={{ color: action.color }}
            />
        </div>
        <div className="text-center">
            <div
                className="text-sm font-semibold"
                style={{ color: action.color }}
            >
                {action.label}
            </div>
            <div className="text-xs text-slate-500">
                {action.description}
            </div>
        </div>
    </motion.button>
}

export default CompletionModalActionButton;
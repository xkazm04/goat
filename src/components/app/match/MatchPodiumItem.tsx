import Image from "next/image";
import { motion } from "framer-motion";
import { MatchGridSlot } from "@/app/features/Match/MatchGridSlot";

type Props = {
    gridItems: any[];
    config: {
        position: number;
        label: string;
        labelClass: string;
        containerClass: string;
        animationDelay: number;
        size?: 'small' | 'medium' | 'large';
    };
    selectedBacklogItem?: string | null;
    selectedGridItem?: string | null;
    handleGridItemClick: (id: string) => void;
}

const MatchPodiumItem = ({gridItems, config, selectedBacklogItem, selectedGridItem, handleGridItemClick}: Props) => {
    
    const item = gridItems[config.position];
    return (
        <motion.div
            key={`podium-${config.position}`}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                delay: config.animationDelay,
                type: "spring",
                stiffness: 300,
                damping: 20
            }}
            className="flex flex-col items-center relative"
        >
            <motion.div
                className={config.labelClass}
                animate={{
                    scale: item?.matched ? 1.1 : 1,
                    color: item?.matched ? '#fbbf24' : undefined
                }}
                transition={{ duration: 0.3 }}
            >
                {config.label}
            </motion.div>
            <Image
                src="/goat.png"
                alt="GOAT Background"
                fill
                className="object-cover opacity-10"
                priority
            />
            <div className={config.containerClass}>
                <MatchGridSlot
                    position={config.position}
                    size={config.size}
                    gridItem={item}
                    selectedBacklogItem={selectedBacklogItem}
                    selectedGridItem={selectedGridItem}
                    onGridItemClick={handleGridItemClick}
                />
            </div>
        </motion.div>
    );
}

export default MatchPodiumItem;
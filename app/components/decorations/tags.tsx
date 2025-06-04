import { motion } from "framer-motion"

type Props = {
    content: string;
}

export const LongTag = ({content}: Props) => {
    return       <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="mt-6"
      >
        <motion.div
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl relative overflow-hidden"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(15, 23, 42, 0.8) 0%,
                rgba(30, 41, 59, 0.9) 50%,
                rgba(15, 23, 42, 0.8) 100%
              )
            `,
            border: '1px solid rgba(251, 191, 36, 0.2)',
            boxShadow: `
              0 8px 32px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `
          }}
          whileHover={{
            scale: 1.02,
            boxShadow: `
              0 12px 40px rgba(0, 0, 0, 0.4),
              0 0 30px rgba(251, 191, 36, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `
          }}
        >
          {/* Animated background shimmer */}
          <motion.div
            className="absolute inset-0 opacity-30"
            style={{
              background: `
                linear-gradient(
                  110deg,
                  transparent 0%,
                  transparent 40%,
                  rgba(251, 191, 36, 0.1) 50%,
                  transparent 60%,
                  transparent 100%
                )
              `
            }}
            animate={{
              x: ['-100%', '100%']
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
              repeatDelay: 2
            }}
          />
          
          <motion.p 
            className="text-sm font-medium uppercase tracking-wider relative z-10"
            style={{
              background: `
                linear-gradient(135deg, 
                  #cbd5e1 0%, 
                  #f1f5f9 50%, 
                  #cbd5e1 100%
                )
              `,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 20px rgba(203, 213, 225, 0.3)'
            }}
          >
            {content}
          </motion.p>
        </motion.div>
      </motion.div>
}

export default LongTag;
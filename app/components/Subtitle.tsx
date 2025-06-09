import { motion } from "framer-motion";

const Subtitle = ({text}: { text: string }) => {
  return (
          <motion.div 
            className="flex items-center justify-center gap-4 mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <motion.div 
              className="h-px flex-1 relative"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              <div 
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, #f59e0b 50%, transparent 100%)`,
                  boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)'
                }}
              />
            </motion.div>
            
            <motion.div 
              className="text-xl font-semibold tracking-wider relative px-6 py-2 rounded-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.6 }}
              style={{
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
              }}
              whileHover={{
                scale: 1.05,
                boxShadow: `
                  0 6px 30px rgba(251, 191, 36, 0.3),
                  inset 0 1px 0 rgba(255, 255, 255, 0.2)
                `
              }}
            >
              {text}
            </motion.div>
            
            <motion.div 
              className="h-px flex-1 relative"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              <div 
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, #f59e0b 50%, transparent 100%)`,
                  boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)'
                }}
              />
            </motion.div>
          </motion.div>
  );
}

export default Subtitle;
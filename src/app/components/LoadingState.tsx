import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="inline-block mb-6"
      >
        <Sparkles className="w-16 h-16 text-primary" />
      </motion.div>

      <h2 className="text-3xl font-bold text-neutral-900 mb-4 font-serif">
        Generating Your Perfect Itinerary
      </h2>

      <div className="space-y-3 text-neutral-600">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          🔍 Analyzing your preferences with vector similarity search...
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          🤖 Running LLM recommendations for personalized experiences...
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          ✨ Crafting the perfect day-by-day itinerary...
        </motion.p>
      </div>

      <div className="mt-8 flex justify-center">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-primary rounded-full"
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

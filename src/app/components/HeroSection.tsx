import { motion } from 'motion/react';
import { Sparkles, Globe } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80')"
        }}
      >
        {/* Overall subtle overlay */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        {/* Radial dark scrim behind text content only */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[-1]">
          <div className="w-full h-full bg-radial-gradient from-black/60 via-black/30 to-transparent rounded-full blur-2xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block mb-6"
          >
            <Globe className="w-14 h-14 text-white opacity-60 mx-auto" strokeWidth={1.5} />
          </motion.div>

          <h1 className="text-6xl md:text-8xl font-bold mb-6 font-serif text-white">
            Welcome, Traveler
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-2xl md:text-3xl text-white/75 mb-4"
          >
            Your next adventure awaits
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-lg md:text-xl text-white/80 mb-12 max-w-3xl mx-auto"
          >
            Powered by advanced AI and vector similarity search, we craft personalized travel experiences
            that match your unique preferences and dreams.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="flex items-center justify-center gap-3 text-white"
          >
            <Sparkles className="w-6 h-6" />
            <span className="text-lg font-medium">Scroll to explore</span>
            <Sparkles className="w-6 h-6" />
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="mt-12"
          >
            <div className="w-6 h-10 border-2 border-white/50 rounded-full mx-auto flex items-start justify-center p-2">
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-1.5 h-1.5 bg-white/70 rounded-full"
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

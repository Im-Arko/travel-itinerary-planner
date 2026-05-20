import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Car, Plane } from 'lucide-react';

export function ScrollVehicle() {
  const [isMounted, setIsMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { scrollYProgress } = useScroll();

  // Transform scroll progress (0 to 1) to horizontal position (0% to 100%)
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '95%']);

  // Transform for progress bar
  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (value) => {
      setScrollProgress(value);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  const isPlane = scrollProgress > 0.5;

  if (!isMounted) return null;

  return (
    <div className="fixed top-1/3 left-0 w-full pointer-events-none z-50">
      <motion.div
        style={{ x }}
        className="relative"
      >
        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          animate={{
            opacity: isPlane ? 0 : 1,
            scale: isPlane ? 0.5 : 1,
            rotate: isPlane ? -45 : 0
          }}
          transition={{ duration: 0.3 }}
          className="absolute"
        >
          <Car className="w-16 h-16 text-blue-600 drop-shadow-lg" strokeWidth={1.5} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: 45 }}
          animate={{
            opacity: isPlane ? 1 : 0,
            scale: isPlane ? 1 : 0.5,
            rotate: isPlane ? 0 : 45,
            y: isPlane ? [0, -10, 0] : 0
          }}
          transition={{
            duration: 0.3,
            y: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          className="absolute"
        >
          <Plane className="w-16 h-16 text-purple-600 drop-shadow-lg" strokeWidth={1.5} />
        </motion.div>
      </motion.div>

      {/* Progress indicator */}
      <motion.div
        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <Car className="w-5 h-5 text-blue-600" />
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
              style={{ width: progressWidth }}
            />
          </div>
          <Plane className="w-5 h-5 text-purple-600" />
        </div>
        <p className="text-xs text-center text-gray-600 mt-1">
          {isPlane ? 'Ready to take off!' : 'Planning your journey...'}
        </p>
      </motion.div>
    </div>
  );
}

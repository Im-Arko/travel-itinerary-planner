import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Map, Heart, Sparkles, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section - Full-bleed travel photo with dark scrim */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80')"
          }}
        >
          {/* Dark overlay scrim */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto text-center relative z-10 px-4">
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
              <Globe className="w-20 h-20 text-white mx-auto" strokeWidth={1.5} />
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 font-serif text-white">
              AI-Powered Travel Planning
            </h1>

            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
              Personalized itineraries crafted by advanced AI and vector similarity search.
              Your perfect journey awaits.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/generate"
                    className="px-8 py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-semibold hover:from-primary/90 hover:to-primary/70 transition-all shadow-lg hover:shadow-xl ring-1 ring-white/20 ring-inset"
                  >
                    Generate Itinerary
                  </Link>
                  <Link
                    to="/destinations"
                    className="px-8 py-4 bg-transparent text-white rounded-xl font-semibold hover:bg-white/10 transition-all border-2 border-white/50 hover:border-white"
                  >
                    Browse Destinations
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="px-8 py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-semibold hover:from-primary/90 hover:to-primary/70 transition-all shadow-lg hover:shadow-xl ring-1 ring-white/20 ring-inset"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    to="/login"
                    className="px-8 py-4 bg-transparent text-white rounded-xl font-semibold hover:bg-white/10 transition-all border-2 border-white/50 hover:border-white"
                  >
                    Login
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-neutral-800 font-serif">
            Why Choose TravelAI?
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-[0_4px_24px_rgba(200,75,49,0.08)] hover:shadow-[0_8px_32px_rgba(200,75,49,0.12)] hover:scale-[1.02] transition-all duration-300 border border-[#e8e2d9]"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-neutral-900 font-serif">AI-Powered Recommendations</h3>
              <p className="text-neutral-600">
                Advanced LLM technology analyzes your preferences to create perfectly tailored itineraries.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl p-8 shadow-[0_4px_24px_rgba(45,106,79,0.08)] hover:shadow-[0_8px_32px_rgba(45,106,79,0.12)] hover:scale-[1.02] transition-all duration-300 border border-[#e8e2d9]"
            >
              <div className="w-14 h-14 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                <Map className="w-7 h-7 text-secondary" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-neutral-900 font-serif">Vector Search</h3>
              <p className="text-neutral-600">
                Find destinations that match your vibe using semantic similarity search technology.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-8 shadow-[0_4px_24px_rgba(32,121,158,0.08)] hover:shadow-[0_8px_32px_rgba(32,121,158,0.12)] hover:scale-[1.02] transition-all duration-300 border border-[#e8e2d9]"
            >
              <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                <Heart className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-neutral-900 font-serif">Save & Share</h3>
              <p className="text-neutral-600">
                Save your favorite itineraries, rate them, and access them anytime from anywhere.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-12 text-center text-white shadow-warm-xl ring-1 ring-white/20 ring-inset">
            <h2 className="text-4xl font-bold mb-4 font-serif">Ready to Start Your Journey?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of travelers who trust TravelAI to plan their perfect trips.
            </p>
            <Link
              to="/register"
              className="inline-block px-10 py-4 bg-white text-primary rounded-xl font-bold hover:bg-neutral-100 transition-all shadow-warm text-lg"
            >
              Create Free Account
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

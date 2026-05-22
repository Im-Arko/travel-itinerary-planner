import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wand2, Map, Heart, Sparkles, ArrowRight, Star, Calendar, MapPin, Sun } from 'lucide-react';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80&auto=format&fit=crop';

// Preference tags for the tag cloud
const preferenceTags = [
  { emoji: '🏖️', label: 'Beaches', key: 'beaches' },
  { emoji: '🍜', label: 'Food scenes', key: 'food' },
  { emoji: '🥾', label: 'Hiking', key: 'hiking' },
  { emoji: '🏛️', label: 'History', key: 'history' },
  { emoji: '🎨', label: 'Art & Culture', key: 'art' },
  { emoji: '🌙', label: 'Nightlife', key: 'nightlife' },
  { emoji: '🧘', label: 'Wellness', key: 'wellness' },
  { emoji: '📸', label: 'Photography', key: 'photography' },
  { emoji: '🦁', label: 'Wildlife', key: 'wildlife' },
  { emoji: '🏔️', label: 'Mountains', key: 'mountains' },
];

// Preview itinerary days for the animated hero
const previewDays = [
  { day: 1, title: 'Arrival & Exploration', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80' },
  { day: 2, title: 'Cultural Discovery', image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=400&q=80' },
  { day: 3, title: 'Adventure Awaits', image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=80' },
];

const features = [
  {
    icon: Sparkles,
    color: 'primary',
    title: 'AI-Powered Recommendations',
    desc: 'Advanced LLM technology analyzes your preferences to create perfectly tailored day-by-day itineraries.',
  },
  {
    icon: Map,
    color: 'forest',
    title: 'Vector Similarity Search',
    desc: 'Find destinations that match your vibe using semantic similarity — not just keywords.',
  },
  {
    icon: Heart,
    color: 'sky',
    title: 'Save & Revisit',
    desc: 'Save your favourite itineraries, rate them, and access them anytime from anywhere.',
  },
];

const iconBg: Record<string, string> = {
  primary: 'bg-primary-50 text-primary-500 border-primary-100',
  forest:  'bg-forest-50  text-forest-500  border-forest-100',
  sky:     'bg-sky-50     text-sky-500     border-sky-100',
};

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative min-h-[90vh] py-20 flex items-center overflow-hidden">
        <img
          src={HERO_IMAGE}
          alt="Open road travel"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white/90 text-sm font-sans mb-6">
                <Star className="w-3.5 h-3.5 text-primary-300" fill="currentColor" />
                AI-powered · Vector search · Personalized
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-4">
                Your perfect trip,{' '}
                <em className="text-primary-300 not-italic">planned for you</em>
              </h1>

              <p className="text-white/80 font-sans text-lg sm:text-xl leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
                Find your next adventure with personalized itineraries crafted by advanced AI.
              </p>

              {/* Preference Tag Cloud */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-10">
                {preferenceTags.map((tag, idx) => (
                  <button
                    key={tag.key}
                    className="group flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium transition-all duration-200 hover:bg-primary-500 hover:border-primary-400 hover:shadow-lg"
                  >
                    <span className="text-base">{tag.emoji}</span>
                    {tag.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                {isAuthenticated ? (
                  <>
                    <Link to="/generate" className="btn-primary text-base px-8 py-4 rounded-2xl shadow-warm-lg">
                      <Wand2 className="w-5 h-5" /> Generate Itinerary
                    </Link>
                    <Link to="/destinations" className="btn-ghost text-base px-8 py-4 rounded-2xl">
                      Browse Destinations <ArrowRight className="w-5 h-5" />
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/register" className="btn-primary text-base px-8 py-4 rounded-2xl shadow-warm-lg">
                      Get Started Free
                    </Link>
                    <Link to="/login" className="btn-ghost text-base px-8 py-4 rounded-2xl">
                      Login <ArrowRight className="w-5 h-5" />
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Right: Animated Itinerary Preview */}
            <div className="hidden lg:block relative">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-primary-400/50" />

                {/* Day cards */}
                <div className="space-y-4">
                  {previewDays.map((day, idx) => (
                    <div
                      key={day.day}
                      className="relative flex items-center gap-4 p-4 bg-white/95 backdrop-blur-sm rounded-2xl shadow-warm-lg border border-white/20 animate-in fade-in slide-in-from-right-8"
                      style={{ animationDelay: `${idx * 200}ms`, animationFillMode: 'both' }}
                    >
                      {/* Day badge on timeline */}
                      <div className="relative z-10 flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {day.day}
                      </div>

                      {/* Day image */}
                      <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={day.image}
                          alt={`Day ${day.day}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Day info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-primary-500 font-medium mb-0.5">Day {day.day}</p>
                        <h3 className="text-sm font-semibold text-sand-800 truncate">{day.title}</h3>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-xs text-sand-400">
                            <MapPin className="w-3 h-3" /> Explore
                          </span>
                          <span className="flex items-center gap-1 text-xs text-sand-400">
                            <Sun className="w-3 h-3" /> Full day
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* "More days" indicator */}
                <div className="mt-4 ml-20 text-center">
                  <span className="inline-flex items-center gap-2 text-sm text-white/70">
                    <Calendar className="w-4 h-4" />
                    And more days tailored to you...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="page-header text-4xl">Why Choose TravelAI?</h2>
          <p className="page-sub max-w-xl mx-auto">
            Three layers of intelligence working together so every recommendation feels personal.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map(({ icon: Icon, color, title, desc }) => (
            <div
              key={title}
              className="card p-8 hover:shadow-warm-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-6 ${iconBg[color]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-sand-800 mb-3">{title}</h3>
              <p className="text-sand-400 font-sans text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      {!isAuthenticated && (
        <section className="bg-sand-800 py-20 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-serif text-4xl font-bold text-white mb-4">
              Ready to start your journey?
            </h2>
            <p className="text-sand-300 font-sans text-base mb-10 leading-relaxed">
              Join travelers who've let AI handle the planning while they focus on the experience.
            </p>
            <Link
              to="/register"
              className="btn-primary text-base px-10 py-4 rounded-2xl shadow-warm-xl"
            >
              Create free account <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Wand2,
  Map,
  Heart,
  Sparkles,
  ArrowRight,
  Star,
  Calendar,
  MapPin,
  Sun,
} from 'lucide-react';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80&auto=format&fit=crop';

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

const previewDays = [
  {
    day: 1,
    title: 'Arrival & Exploration',
    image:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
  },
  {
    day: 2,
    title: 'Cultural Discovery',
    image:
      'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=400&q=80',
  },
  {
    day: 3,
    title: 'Adventure Awaits',
    image:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=80',
  },
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
  primary:
    'bg-primary-50 text-primary-500 border-primary-100',
  forest:
    'bg-forest-50 text-forest-500 border-forest-100',
  sky:
    'bg-sky-50 text-sky-500 border-sky-100',
};

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-gradient-to-b from-sand-50 to-white">
      {/* HERO */}
      <section className="relative min-h-[88vh] flex items-center overflow-hidden">
        {/* Background */}
        <img
          src={HERO_IMAGE}
          alt="Open road travel"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/75" />

        {/* Glow */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl" />
          <div className="absolute bottom-10 right-20 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* LEFT */}
            <div className="text-center lg:text-left">
              <div
                className="
                  inline-flex items-center gap-2
                  rounded-full border border-white/20
                  bg-white/10 backdrop-blur-md
                  px-5 py-2
                  text-xs font-medium text-white/90
                  mb-7
                "
              >
                <Star
                  className="w-4 h-4 text-primary-300"
                  fill="currentColor"
                />
                AI-powered · Personalized
              </div>

              <h1
                className="
                  font-serif text-4xl sm:text-5xl lg:text-6xl
                  font-bold leading-tight tracking-tight
                  text-white mb-6
                "
              >
                Your perfect trip,
                <span className="block text-primary-300">
                  planned for you
                </span>
              </h1>

              <p
                className="
                  max-w-xl mx-auto lg:mx-0
                  text-sm sm:text-base
                  leading-relaxed text-white/75
                  mb-8
                "
              >
                Discover destinations, hidden gems, and
                personalized itineraries crafted by AI
                around your travel style.
              </p>

              {/* TAGS */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-8">
                {preferenceTags.map((tag) => (
                  <button
                    key={tag.key}
                    className="
                      group flex items-center gap-1.5
                      px-3 py-2 rounded-xl
                      bg-white/10 backdrop-blur-sm
                      border border-white/20
                      text-white text-xs font-medium
                      transition-all duration-300 transform-gpu
                      hover:bg-primary-500/90
                      hover:border-primary-300
                      hover:-translate-y-0.5
                      hover:shadow-xl
                    "
                  >
                    <span className="text-sm">
                      {tag.emoji}
                    </span>
                    {tag.label}
                  </button>
                ))}
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/generate"
                      className="
                        group inline-flex items-center justify-center gap-2
                        rounded-2xl bg-primary-500
                        px-6 py-3.5 text-sm font-semibold text-white
                        shadow-warm-xl
                        transition-all duration-300
                        hover:bg-primary-600
                        hover:-translate-y-1
                        hover:shadow-2xl
                      "
                    >
                      <Wand2 className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
                      Generate Itinerary
                    </Link>

                    <Link
                      to="/destinations"
                      className="
                        inline-flex items-center justify-center gap-2
                        rounded-2xl border border-white/20
                        bg-white/10 backdrop-blur-md
                        px-6 py-3.5 text-sm font-medium text-white
                        transition-all duration-300
                        hover:bg-white/20
                        hover:border-white/40
                        hover:-translate-y-1
                      "
                    >
                      Browse Destinations
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="
                        group relative inline-flex items-center justify-center gap-2
                        overflow-hidden rounded-2xl
                        border border-primary-400
                        bg-primary-500 px-6 py-3.5
                        text-sm font-semibold text-white
                        shadow-warm-xl
                        transition-all duration-300
                        hover:-translate-y-1
                        hover:shadow-2xl
                      "
                    >
                      <span
                        className="
                          absolute inset-0
                          -translate-x-full skew-x-12
                          bg-white/20
                          transition-transform duration-700
                          group-hover:translate-x-[180%]
                        "
                      />

                      <span className="relative z-10 flex items-center gap-2">
                        Get Started Free
                        <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </Link>

                    <Link
                      to="/login"
                      className="
                        inline-flex items-center justify-center gap-2
                        rounded-2xl border border-white/20
                        bg-white/10 backdrop-blur-md
                        px-6 py-3.5 text-sm font-medium text-white
                        transition-all duration-300
                        hover:bg-white/20
                        hover:border-white/40
                        hover:-translate-y-1
                      "
                    >
                      Login
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div className="hidden lg:block relative">
              <div className="relative">
                {/* Timeline */}
                  <div className="absolute left-8 top-0 bottom-3 w-0.5 flex flex-col">
                    {/* solid part */}
                    <div className="flex-1 bg-gradient-to-b from-primary-300 via-primary-400 to-primary-500" />

                    {/* dotted bottom */}
                    <div className="h-20 border-l-5 border-dotted border-primary-500/60" />
                  </div>

                <div className="space-y-5">
                  {previewDays.map((day, idx) => (
                    <div
                      key={day.day}
                      className="
                        relative flex items-center gap-3 p-3
                        bg-white/90 backdrop-blur-md
                        rounded-2xl
                        shadow-2xl shadow-black/10
                        border border-white/40
                        transition-all duration-300
                        hover:-translate-y-1
                        hover:shadow-2xl hover:shadow-primary-500/10
                        animate-in fade-in slide-in-from-right-8
                      "
                      style={{
                        animationDelay: `${idx * 200}ms`,
                        animationFillMode: 'both',
                      }}
                    >
                      {/* DAY BADGE */}
                      <div
                        className="
                          relative z-10 flex-shrink-0
                          w-12 h-12 rounded-2xl
                          bg-gradient-to-br from-primary-500 to-primary-700
                          ring-4 ring-white/40
                          flex items-center justify-center
                          text-white font-bold text-base
                          shadow-xl
                        "
                      >
                        {day.day}
                      </div>

                      {/* IMAGE */}
                      <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={day.image}
                          alt={`Day ${day.day}`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* INFO */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-primary-500 mb-1">
                          Day {day.day}
                        </p>

                        <h3 className="text-sm font-semibold text-sand-800 truncate">
                          {day.title}
                        </h3>

                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs text-sand-400">
                            <MapPin className="w-3 h-3" />
                            Explore
                          </span>

                          <span className="flex items-center gap-1 text-xs text-sand-400">
                            <Sun className="w-3 h-3" />
                            Full day
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-6 ml-20">
                  <span className="inline-flex items-center gap-2 text-xs text-white/70">
                    <Calendar className="w-4 h-4" />
                    And more days tailored to you...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2
            className="
              font-serif text-4xl sm:text-5xl
              font-bold tracking-tight
              text-sand-900 mb-5
            "
          >
            Why Choose TRAVELLANT?
          </h2>

          <p
            className="
              text-sand-400 text-base
              leading-relaxed max-w-2xl mx-auto
            "
          >
            Three intelligent systems working together
            to create recommendations that feel deeply
            personal.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, color, title, desc }) => (
            <div
              key={title}
              className="
                group relative overflow-hidden
                rounded-3xl border border-sand-200
                bg-white/80 backdrop-blur-sm
                p-8
                shadow-lg shadow-black/5
                transition-all duration-300
                hover:-translate-y-1
                hover:shadow-2xl hover:shadow-primary-500/10
              "
            >
              {/* Glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary-100 blur-3xl" />
              </div>

              <div
                className={`
                  w-12 h-12 rounded-2xl border
                  flex items-center justify-center mb-6
                  transition-transform duration-300
                  group-hover:scale-110
                  ${iconBg[color]}
                `}
              >
                <Icon className="w-5 h-5" />
              </div>

              <h3 className="font-serif text-x1 font-semibold text-sand-800 mb-4">
                {title}
              </h3>

              <p className="text-sand-400 leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!isAuthenticated && (
        <section className="bg-sand-800 py-20 px-6 relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-amber-200 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-orange-300 rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-3xl mx-auto text-center">
            <span
              className="
                inline-flex items-center
                rounded-full border border-sand-600
                bg-sand-700/60 px-4 py-1.5
                text-xs font-medium text-sand-200
                backdrop-blur-sm mb-6
              "
            >
              Smart AI Travel Planning
            </span>

            <h2
              className="
                font-serif text-4xl sm:text-5xl
                font-bold text-black
                leading-tight tracking-tight mb-5
              "
            >
              Ready to start your
              <span className="text-terracotta-500">
                {' '}
                next journey?
              </span>
            </h2>

            <p
              className="
                text-sand-300 font-sans
                text-base leading-relaxed
                max-w-2xl mx-auto mb-8
              "
            >
              Join travelers who let AI handle the
              planning while they focus on unforgettable
              experiences, hidden gems, and meaningful
              adventures.
            </p>

            <div className="flex items-center justify-center">
              <Link
                to="/register"
                className="
                  group relative inline-flex items-center justify-center gap-2
                  overflow-hidden rounded-2xl
                  border border-terracotta-500
                  bg-terracotta-500 px-7 py-3.5
                  text-sm font-semibold text-sand-50
                  shadow-warm-xl
                  transition-all duration-300
                  hover:-translate-y-1 hover:shadow-2xl
                "
              >
                <span
                  className="
                    absolute inset-0
                    -translate-x-full skew-x-12
                    bg-white/20
                    transition-transform duration-700
                    group-hover:translate-x-[180%]
                  "
                />

                <span className="relative z-10 flex items-center gap-2">
                  Create Free Account
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
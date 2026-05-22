import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wand2, Map, Heart, Sparkles, ArrowRight, Star } from 'lucide-react';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80&auto=format&fit=crop';

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
      <section className="relative h-[88vh] min-h-[560px] flex items-center justify-center overflow-hidden">
        <img
          src={HERO_IMAGE}
          alt="Open road travel"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/35 to-black/65" />

        <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white/90 text-sm font-sans mb-8">
            <Star className="w-3.5 h-3.5 text-primary-300" fill="currentColor" />
            AI-powered · Vector search · Personalized
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-[1.08] tracking-tight mb-6">
            Your perfect trip,{' '}
            <em className="text-primary-300 not-italic">planned for you</em>
          </h1>

          <p className="text-white/75 font-sans text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto">
            Personalized itineraries crafted by advanced AI and vector similarity search.
            Tell us what you love — we'll handle the rest.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
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
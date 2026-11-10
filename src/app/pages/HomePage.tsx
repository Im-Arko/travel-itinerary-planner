import { InterestIcon } from '../components/InterestIcon';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Wand2,
  ArrowRight,
  Star,
  Calendar,
  MapPin,
  Sun,
} from 'lucide-react';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80&auto=format&fit=crop';

const preferenceTags = [
  { label: 'Beaches', key: 'beaches' },
  { label: 'Food scenes', key: 'food' },
  { label: 'Hiking', key: 'hiking' },
  { label: 'History', key: 'history' },
  { label: 'Art & Culture', key: 'art' },
  { label: 'Nightlife', key: 'nightlife' },
  { label: 'Wellness', key: 'wellness' },
  { label: 'Photography', key: 'photography' },
  { label: 'Wildlife', key: 'wildlife' },
  { label: 'Mountains', key: 'mountains' },
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

const planningSteps = [
  {
    title: 'Tell us what makes a good trip.',
    description: 'Set your budget, trip length and interests. A week of walking trails should look different from a weekend of food and museums.',
  },
  {
    title: 'Find a place that fits.',
    description: 'Describe what you’re looking for in your own words. Explore destinations, then get a day-by-day plan built around your preferences.',
  },
  {
    title: 'Keep the details together.',
    description: 'Save your itinerary, add your own notes and come back to it when it’s time to pack. Your next trip has a place to start.',
  },
];

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
                <span className="font-stencil tracking-wider">Made for the journey</span>
              </div>

              <h1
                className="
                  font-serif text-4xl sm:text-5xl lg:text-6xl
                  font-bold leading-tight tracking-tight
                  text-white mb-6
                "
              >
                Your next trip,
                <span className="block font-script font-semibold text-primary-300">
                  planned with care
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
                source-backed plans with AI-assisted selection
                around your travel style. Prices and availability stay clearly marked.
              </p>

              {/* TAGS */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-8">
                {preferenceTags.map((tag) => (
                  <Link
                    to={`/generate?interest=${encodeURIComponent(tag.key)}`}
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
                    <InterestIcon interest={tag.key} />
                    {tag.label}
                  </Link>
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

      <section aria-labelledby="planning-heading" className="bg-[#FAF6F1] px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 grid gap-5 lg:mb-14 lg:grid-cols-2 lg:items-end lg:gap-20">
            <div>
              <p className="mb-4 font-stencil text-xs uppercase tracking-[0.18em] text-[#6C7661]">
                Before you go
              </p>
              <h2 id="planning-heading" className="max-w-xl scroll-mt-24 text-balance font-display text-3xl leading-[1.25] text-[#2C3429] sm:text-4xl lg:text-[2.75rem]">
                The trip starts with you.
              </h2>
            </div>
            <p className="max-w-md font-sans text-base leading-7 text-[#686A60]">
              A few details about how you like to travel. A place that catches your eye.
              We help turn that first idea into a plan for each day.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
            <figure className="relative mx-auto w-full max-w-lg pb-6 sm:pr-5 lg:mx-0">
              <div className="border border-[#DED7C9] bg-[#FFFDFA] p-3 sm:p-4">
                <img
                  src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1000&q=85"
                  alt="A quiet lake surrounded by mountain peaks"
                  loading="lazy"
                  width={1000}
                  height={800}
                  className="aspect-[5/4] w-full object-cover"
                />
                <figcaption className="px-2 pb-1 pt-4 font-script text-2xl leading-tight text-[#5F6956] sm:text-3xl">
                  Leave a little room to wander.
                </figcaption>
              </div>
              <div aria-hidden="true" className="absolute bottom-0 right-0 hidden h-24 w-24 rotate-[-9deg] items-center justify-center rounded-full border border-dashed border-[#7D886E] bg-[#FAF6F1] text-center font-stencil text-[10px] uppercase leading-4 tracking-widest text-[#5F6956] sm:flex">
                Made for<br />your kind<br />of travel
              </div>
            </figure>

            <ol className="divide-y divide-[#DDD9CD] border-y border-[#DDD9CD]">
              {planningSteps.map(({ title, description }, index) => (
                <li key={title} className="grid grid-cols-[2rem_1fr] gap-4 py-7 sm:grid-cols-[2.5rem_1fr] sm:gap-6 sm:py-8">
                  <span aria-hidden="true" className="pt-1 font-stencil text-sm tracking-wider text-[#8A7964]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="mb-2 font-sans text-lg font-semibold leading-snug text-[#2C3429] sm:text-xl">
                      {title}
                    </h3>
                    <p className="max-w-lg font-sans text-sm leading-7 text-[#686A60] sm:text-[15px]">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-12 flex flex-col gap-7 border-t border-[#DDD9CD] pt-9 sm:mt-16 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:pt-10">
            <div className="max-w-lg">
              <h3 className="mb-2 font-sans text-xl font-semibold text-[#2C3429] sm:text-2xl">
                Have a place in mind?
              </h3>
              <p className="font-sans text-sm leading-6 text-[#686A60]">
                Start with a destination, or let your interests lead the way.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-6">
              <Link
                to={isAuthenticated ? '/generate' : '/register'}
                className="inline-flex min-h-12 items-center justify-center gap-4 rounded-lg bg-[#355347] px-6 py-3 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#263E34] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#355347]"
              >
                {isAuthenticated ? 'Plan your next trip' : 'Create an account'}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              {!isAuthenticated && (
                <Link to="/login" className="py-2 font-sans text-sm font-medium text-[#355347] underline decoration-[#B3BAAA] underline-offset-4 transition-colors hover:text-[#1D3529] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#355347]">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

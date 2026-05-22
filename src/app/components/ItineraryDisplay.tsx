import { MapPin, DollarSign, Star, Clock, Sunrise, Sunset, Sun } from 'lucide-react';
import { motion } from 'motion/react';

interface DayActivity {
  time: string;
  activity: string;
  location: string;
  description: string;
  cost: string;
}

interface ItineraryDay {
  day: number;
  title: string;
  activities: DayActivity[];
}

interface Itinerary {
  destination: string;
  overview: string;
  highlights: string[];
  days: ItineraryDay[];
  totalCost: string;
  similarityScore: number;
}

interface ItineraryDisplayProps {
  itinerary: Itinerary;
  onBack: () => void;
}

// Helper to get icon based on time of day
const getTimeIcon = (time: string) => {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 10) return <Sunrise className="w-4 h-4" />;
  if (hour < 17) return <Sun className="w-4 h-4" />;
  return <Sunset className="w-4 h-4" />;
};

export function ItineraryDisplay({ itinerary, onBack }: ItineraryDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-2xl p-8 mb-10 shadow-warm-lg ring-1 ring-white/20 ring-inset">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold font-serif">{itinerary.destination}</h1>
          <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
            <Star className="w-5 h-5 fill-yellow-300 text-yellow-300" />
            <span className="font-semibold">{itinerary.similarityScore}% Match</span>
          </div>
        </div>
        <p className="text-lg opacity-90 mb-4">{itinerary.overview}</p>
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          <span className="font-semibold">Estimated Total: {itinerary.totalCost}</span>
        </div>
      </div>

      {/* Highlights */}
      <div className="bg-white rounded-2xl p-6 mb-10 shadow-warm-lg border border-neutral-100">
        <h2 className="text-2xl font-bold mb-4 text-neutral-900 font-serif">Trip Highlights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {itinerary.highlights.map((highlight, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"></div>
              <p className="text-neutral-700">{highlight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="relative mb-10">
        {/* Timeline line - terracotta colored */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-primary-300" />

        {/* Day cards connected by timeline */}
        <div className="space-y-8">
          {itinerary.days.map((day, index) => (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.15 }}
              className="relative pl-20"
            >
              {/* Day number badge on timeline */}
              <div className="absolute left-0 top-0 w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-xl shadow-lg z-10 border-4 border-white">
                {day.day}
              </div>

              {/* Day card */}
              <div className="bg-white rounded-2xl p-6 shadow-warm-lg border border-neutral-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-neutral-900 font-serif">{day.title}</h3>
                  <span className="text-sm text-primary-500 font-medium">Day {day.day}</span>
                </div>

                {/* Activities list */}
                <div className="space-y-3">
                  {day.activities.map((activity, idx) => (
                    <div
                      key={idx}
                      className="flex gap-4 p-4 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors"
                    >
                      {/* Time & Icon */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-1 text-primary-600">
                        <span className="text-xs font-semibold">{activity.time}</span>
                        {getTimeIcon(activity.time)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-neutral-900">{activity.activity}</h4>
                          {activity.cost && (
                            <span className="text-xs font-medium text-secondary shrink-0">
                              {activity.cost}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-500 text-xs mb-1.5">
                          <MapPin className="w-3 h-3 text-primary" />
                          {activity.location}
                        </div>
                        {activity.description && (
                          <p className="text-sm text-neutral-600">{activity.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Timeline end cap */}
        <div className="relative pl-20 mt-4">
          <div className="w-4 h-4 rounded-full bg-primary-400 border-2 border-white shadow z-10" />
        </div>
      </div>

      <button
        onClick={onBack}
        className="w-full py-4 bg-neutral-200 text-neutral-800 font-semibold rounded-lg hover:bg-neutral-300 transition-all"
      >
        Plan Another Trip
      </button>
    </motion.div>
  );
}

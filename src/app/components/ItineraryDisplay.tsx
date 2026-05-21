import { MapPin, DollarSign, Star, Clock } from 'lucide-react';
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

export function ItineraryDisplay({ itinerary, onBack }: ItineraryDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-8 mb-8 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold">{itinerary.destination}</h1>
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
      <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Trip Highlights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {itinerary.highlights.map((highlight, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <p className="text-gray-700">{highlight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Itinerary */}
      <div className="space-y-6 mb-8">
        {itinerary.days.map((day) => (
          <motion.div
            key={day.day}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: day.day * 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {day.day}
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{day.title}</h3>
            </div>

            <div className="space-y-4">
              {day.activities.map((activity, idx) => (
                <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="flex items-center gap-2 text-blue-600 font-semibold mb-1">
                      <Clock className="w-4 h-4" />
                      {activity.time}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{activity.activity}</h4>
                      <span className="text-sm font-medium text-green-600">{activity.cost}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                      <MapPin className="w-4 h-4" />
                      {activity.location}
                    </div>
                    <p className="text-gray-700">{activity.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <button
        onClick={onBack}
        className="w-full py-4 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-all"
      >
        Plan Another Trip
      </button>
    </motion.div>
  );
}

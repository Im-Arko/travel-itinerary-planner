import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { mockSavedItineraries } from '../data/mockItineraries';
import {
  ArrowLeft, Heart, Star, MapPin, Calendar, DollarSign,
  Clock, Home, Lightbulb, Sun, CloudRain, Moon
} from 'lucide-react';

export function ItineraryDetailPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState(mockSavedItineraries.find(i => i.id === id));

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!itinerary) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Itinerary Not Found</h2>
          <Link to="/itineraries" className="text-blue-600 hover:text-blue-700">
            Back to Saved Itineraries
          </Link>
        </div>
      </div>
    );
  }

  const toggleFavorite = () => {
    setItinerary(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : undefined);
  };

  const getTimeIcon = (time: string) => {
    if (time.toLowerCase().includes('morning') || parseInt(time) < 12) {
      return <Sun className="w-5 h-5 text-yellow-500" />;
    } else if (time.toLowerCase().includes('afternoon') || parseInt(time) < 18) {
      return <CloudRain className="w-5 h-5 text-blue-500" />;
    } else {
      return <Moon className="w-5 h-5 text-purple-500" />;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero */}
      <div className="relative h-80 overflow-hidden">
        <img
          src={itinerary.imageUrl}
          alt={itinerary.destination}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <Link
          to="/itineraries"
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </Link>

        <button
          onClick={toggleFavorite}
          className="absolute top-6 right-6 p-3 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
        >
          <Heart
            className={`w-6 h-6 ${
              itinerary.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'
            }`}
          />
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-5xl font-bold text-white mb-3">{itinerary.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-white">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                {itinerary.destination}, {itinerary.country}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {new Date(itinerary.tripDates.start).toLocaleDateString()} -{' '}
                {new Date(itinerary.tripDates.end).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, idx) => (
                  <Star
                    key={idx}
                    className={`w-5 h-5 ${
                      idx < itinerary.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-8 mb-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-blue-100 mb-1">Total Duration</p>
              <p className="text-3xl font-bold">{itinerary.days.length} Days</p>
            </div>
            <div>
              <p className="text-blue-100 mb-1">Estimated Cost</p>
              <p className="text-3xl font-bold">{itinerary.totalCost}</p>
            </div>
            <div>
              <p className="text-blue-100 mb-1">Created On</p>
              <p className="text-3xl font-bold">
                {new Date(itinerary.dateCreated).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Daily Itinerary */}
        <div className="space-y-6">
          {itinerary.days.map((day) => (
            <div key={day.day} className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Day Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Day {day.day}</h2>
                    <p className="text-blue-100">{new Date(day.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}</p>
                  </div>
                </div>
              </div>

              {/* Activities */}
              <div className="p-6 space-y-6">
                {/* Morning */}
                <div className="border-l-4 border-yellow-400 pl-6">
                  <div className="flex items-center gap-2 mb-3">
                    {getTimeIcon(day.morning.time)}
                    <h3 className="text-lg font-bold text-gray-800">Morning</h3>
                    <span className="text-sm text-gray-500">{day.morning.time}</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-1">{day.morning.activity}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4" />
                    {day.morning.location}
                  </div>
                  <p className="text-gray-600 mb-2">{day.morning.description}</p>
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <DollarSign className="w-4 h-4" />
                    {day.morning.cost}
                  </div>
                </div>

                {/* Afternoon */}
                <div className="border-l-4 border-blue-400 pl-6">
                  <div className="flex items-center gap-2 mb-3">
                    {getTimeIcon(day.afternoon.time)}
                    <h3 className="text-lg font-bold text-gray-800">Afternoon</h3>
                    <span className="text-sm text-gray-500">{day.afternoon.time}</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-1">{day.afternoon.activity}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4" />
                    {day.afternoon.location}
                  </div>
                  <p className="text-gray-600 mb-2">{day.afternoon.description}</p>
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <DollarSign className="w-4 h-4" />
                    {day.afternoon.cost}
                  </div>
                </div>

                {/* Evening */}
                <div className="border-l-4 border-purple-400 pl-6">
                  <div className="flex items-center gap-2 mb-3">
                    {getTimeIcon(day.evening.time)}
                    <h3 className="text-lg font-bold text-gray-800">Evening</h3>
                    <span className="text-sm text-gray-500">{day.evening.time}</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-1">{day.evening.activity}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4" />
                    {day.evening.location}
                  </div>
                  <p className="text-gray-600 mb-2">{day.evening.description}</p>
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <DollarSign className="w-4 h-4" />
                    {day.evening.cost}
                  </div>
                </div>

                {/* Accommodation */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="w-5 h-5 text-gray-600" />
                    <h4 className="font-semibold text-gray-800">Accommodation</h4>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{day.accommodation.name}</p>
                      <p className="text-sm text-gray-600">{day.accommodation.type}</p>
                    </div>
                    <div className="text-green-600 font-semibold">
                      {day.accommodation.cost}
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-800">Local Tips</h4>
                  </div>
                  <ul className="space-y-2">
                    {day.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1.5"></span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

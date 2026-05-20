import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { mockSavedItineraries } from '../data/mockItineraries';
import { Heart, Calendar, MapPin, Star, DollarSign } from 'lucide-react';

export function SavedItinerariesPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [itineraries, setItineraries] = useState(mockSavedItineraries);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const toggleFavorite = (id: string) => {
    setItineraries(prev =>
      prev.map(itin =>
        itin.id === id ? { ...itin, isFavorite: !itin.isFavorite } : itin
      )
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">Saved Itineraries</h1>
          <p className="text-lg text-gray-600">
            Your collection of personalized travel plans
          </p>
        </div>

        {/* Itineraries Grid */}
        {itineraries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itineraries.map(itinerary => (
              <div
                key={itinerary.id}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={itinerary.imageUrl}
                    alt={itinerary.destination}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => toggleFavorite(itinerary.id)}
                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        itinerary.isFavorite
                          ? 'fill-red-500 text-red-500'
                          : 'text-gray-600'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-5">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {itinerary.title}
                  </h3>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <MapPin className="w-4 h-4" />
                      {itinerary.destination}, {itinerary.country}
                    </div>

                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Calendar className="w-4 h-4" />
                      {new Date(itinerary.tripDates.start).toLocaleDateString()} -{' '}
                      {new Date(itinerary.tripDates.end).toLocaleDateString()}
                    </div>

                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <DollarSign className="w-4 h-4" />
                      {itinerary.totalCost}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-4 h-4 ${
                            idx < itinerary.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {itinerary.days.length} days
                    </span>
                  </div>

                  <Link
                    to={`/itineraries/${itinerary.id}`}
                    className="block w-full py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
              <Heart className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">
              No saved itineraries yet
            </h3>
            <p className="text-gray-600 mb-6">
              Generate your first itinerary to get started
            </p>
            <Link
              to="/generate"
              className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
            >
              Generate Itinerary
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

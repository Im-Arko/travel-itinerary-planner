import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Itinerary, itinerariesApi } from '../services/api';
import { errorMessage } from '../utils/formatters';
import { Heart, Calendar, MapPin, Star, DollarSign, AlertCircle } from 'lucide-react';

export function SavedItinerariesPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/login');
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError('');
    itinerariesApi.list({ limit: 50 })
      .then(setItineraries)
      .catch(err => setError(errorMessage(err, 'Unable to load itineraries.')))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const toggleFavorite = async (itinerary: Itinerary) => {
    const previous = itineraries;
    setItineraries(prev => prev.map(item => item.id === itinerary.id ? { ...item, is_favorite: !item.is_favorite } : item));
    try {
      await itinerariesApi.update(itinerary.id, { is_favorite: !itinerary.is_favorite });
    } catch (err) {
      setItineraries(previous);
      setError(errorMessage(err, 'Unable to update favorite status.'));
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">Saved Itineraries</h1>
          <p className="text-lg text-gray-600">Your backend-saved travel plans.</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <p className="text-gray-600">Loading itineraries...</p>
        ) : itineraries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itineraries.map(itinerary => (
              <div key={itinerary.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden">
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-5 text-white">
                  <button onClick={() => toggleFavorite(itinerary)} className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
                    <Heart className={`w-5 h-5 ${itinerary.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                  </button>
                  <h3 className="mr-12 text-xl font-bold">{itinerary.title}</h3>
                  <p className="mt-2 text-blue-50">{itinerary.summary || itinerary.destination_name}</p>
                </div>

                <div className="p-5">
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <MapPin className="w-4 h-4" />
                      {itinerary.destination_name}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Calendar className="w-4 h-4" />
                      {itinerary.duration_days} days, created {new Date(itinerary.generated_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <DollarSign className="w-4 h-4" />
                      {itinerary.budget}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, idx) => (
                        <Star key={idx} className={`w-4 h-4 ${idx < (itinerary.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 capitalize">{itinerary.status}</span>
                  </div>

                  <Link to={`/itineraries/${itinerary.id}`} className="block w-full py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors font-medium">
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
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">No saved itineraries yet</h3>
            <p className="text-gray-600 mb-6">Generate your first itinerary to get started.</p>
            <Link to="/generate" className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg">
              Generate Itinerary
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

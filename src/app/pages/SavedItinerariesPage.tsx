import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Itinerary, itinerariesApi } from '../services/api';
import { errorMessage } from '../utils/formatters';
import { Heart, Calendar, MapPin, Star, DollarSign, AlertCircle, Luggage, Wand2, ArrowRight, Sparkles } from 'lucide-react';

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
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-sm font-sans mb-4">
            <Heart className="w-4 h-4" />
            Your Collection
          </div>
          <h1 className="font-serif text-4xl font-bold text-sand-800 mb-3">Saved Itineraries</h1>
          <p className="text-sand-500 font-sans text-lg">Your personalized travel plans, saved and organized.</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block p-4 bg-sand-100 rounded-full mb-4 animate-pulse">
              <Calendar className="w-8 h-8 text-sand-400" />
            </div>
            <p className="text-sand-500">Loading your itineraries...</p>
          </div>
        ) : itineraries.length > 0 ? (
          <>
            {/* Stats bar */}
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="bg-white rounded-xl px-5 py-3 shadow-warm border border-sand-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <p className="text-xs text-sand-400">Total Trips</p>
                  <p className="font-bold text-sand-800">{itineraries.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl px-5 py-3 shadow-warm border border-sand-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-50 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-secondary-500" />
                </div>
                <div>
                  <p className="text-xs text-sand-400">Favorites</p>
                  <p className="font-bold text-sand-800">{itineraries.filter(i => i.is_favorite).length}</p>
                </div>
              </div>
            </div>

            {/* Itinerary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {itineraries.map(itinerary => (
                <Link
                  key={itinerary.id}
                  to={`/itineraries/${itinerary.id}`}
                  className="group bg-white rounded-2xl shadow-warm hover:shadow-warm-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden border border-sand-100"
                >
                  {/* Header with gradient */}
                  <div className="relative bg-gradient-to-r from-primary-500 to-secondary-500 p-5 text-white">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleFavorite(itinerary);
                      }}
                      className="absolute top-3 right-3 p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
                    >
                      <Heart className={`w-4 h-4 ${itinerary.is_favorite ? 'fill-white text-white' : 'text-white/70'}`} />
                    </button>
                    <h3 className="font-serif text-xl font-bold pr-10">{itinerary.title}</h3>
                    <p className="text-white/85 text-sm mt-1 line-clamp-1">{itinerary.summary || itinerary.destination_name}</p>
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sand-500 text-sm">
                        <MapPin className="w-4 h-4 text-primary-500" />
                        <span className="font-medium text-sand-700">{itinerary.destination_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sand-500 text-sm">
                        <Calendar className="w-4 h-4 text-primary-500" />
                        <span>{itinerary.duration_days} days</span>
                        <span className="text-sand-300">•</span>
                        <span>{new Date(itinerary.generated_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sand-500 text-sm">
                        <DollarSign className="w-4 h-4 text-primary-500" />
                        <span className="capitalize">{itinerary.budget}</span>
                      </div>
                    </div>

                    {/* Rating & Status */}
                    <div className="flex items-center justify-between mb-4 pt-3 border-t border-sand-100">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= (itinerary.rating || 0)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-sand-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-sand-100 text-sand-600 capitalize">
                        {itinerary.status}
                      </span>
                    </div>

                    {/* View button */}
                    <div className="flex items-center text-primary-500 text-sm font-medium group-hover:gap-2 gap-1 transition-all">
                      View Details <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20 px-6">
            {/* Illustrated empty state with suitcase */}
            <div className="relative inline-block mb-8">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center mx-auto">
                <div className="relative">
                  <Luggage className="w-16 h-16 text-primary-400" />
                  {/* Decorative sparkles */}
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary-200 flex items-center justify-center">
                    <Star className="w-3 h-3 text-primary-500 fill-primary-500" />
                  </div>
                  <div className="absolute -bottom-1 -left-3 w-4 h-4 rounded-full bg-secondary-200" />
                </div>
              </div>
              {/* Dotted path decoration */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                <div className="w-2 h-2 rounded-full bg-sand-200" />
                <div className="w-2 h-2 rounded-full bg-sand-300" />
                <div className="w-2 h-2 rounded-full bg-sand-200" />
                <div className="w-2 h-2 rounded-full bg-sand-300" />
                <div className="w-2 h-2 rounded-full bg-sand-200" />
              </div>
            </div>

            <h3 className="font-serif text-2xl font-semibold text-sand-800 mb-3">Your next adventure awaits</h3>
            <p className="text-sand-500 font-sans text-base mb-8 max-w-md mx-auto leading-relaxed">
              Your saved itineraries will appear here. Generate your first personalized trip and start collecting memories.
            </p>

            <Link
              to="/generate"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-2xl font-semibold hover:from-primary-600 hover:to-secondary-600 transition-all shadow-warm-lg ring-1 ring-white/20 ring-inset group"
            >
              <Wand2 className="w-5 h-5" />
              Generate Your First Itinerary
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Feature highlights */}
            <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm text-sand-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                AI-powered recommendations
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary-400" />
                Vector similarity search
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                Personalized for you
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

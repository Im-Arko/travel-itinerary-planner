import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ItineraryWithDays, itinerariesApi } from '../services/api';
import { errorMessage } from '../utils/formatters';
import { ArrowLeft, Heart, Star, MapPin, Calendar, DollarSign, Home, Lightbulb, Sun, CloudRain, Moon } from 'lucide-react';

export function ItineraryDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState<ItineraryWithDays | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/login');
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;

    setIsLoading(true);
    setError('');
    itinerariesApi.get(Number(id))
      .then(setItinerary)
      .catch(err => setError(errorMessage(err, 'Itinerary not found.')))
      .finally(() => setIsLoading(false));
  }, [id, isAuthenticated]);

  const toggleFavorite = async () => {
    if (!itinerary) return;
    const next = !itinerary.is_favorite;
    setItinerary({ ...itinerary, is_favorite: next });
    try {
      await itinerariesApi.update(itinerary.id, { is_favorite: next });
    } catch (err) {
      setItinerary({ ...itinerary, is_favorite: !next });
      setError(errorMessage(err, 'Unable to update favorite status.'));
    }
  };

  if (loading || isLoading) return null;

  if (error || !itinerary) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-800 mb-2 font-serif">{error || 'Itinerary not found.'}</h2>
          <Link to="/itineraries" className="text-primary hover:text-primary/80 font-medium">Back to Saved Itineraries</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="relative overflow-hidden bg-gradient-to-r from-primary to-secondary px-4 py-16 text-white">
        <Link to="/itineraries" className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/90 text-neutral-800 backdrop-blur-sm rounded-lg hover:bg-white transition-colors shadow-warm">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </Link>

        <button onClick={toggleFavorite} className="absolute top-6 right-6 p-3 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-warm">
          <Heart className={`w-6 h-6 ${itinerary.is_favorite ? 'fill-red-500 text-red-500' : 'text-neutral-600'}`} />
        </button>

        <div className="max-w-7xl mx-auto pt-10">
          <h1 className="text-5xl font-bold mb-3 font-serif">{itinerary.title}</h1>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2"><MapPin className="w-5 h-5" />{itinerary.destination_name}</div>
            <div className="flex items-center gap-2"><Calendar className="w-5 h-5" />{itinerary.duration_days} days</div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, idx) => (
                <Star key={idx} className={`w-5 h-5 ${idx < (itinerary.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-white/50'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-2xl p-8 mb-8 shadow-warm-lg ring-1 ring-white/20 ring-inset">
          <div className="grid md:grid-cols-3 gap-6">
            <div><p className="text-white/80 mb-1">Duration</p><p className="text-3xl font-bold">{itinerary.duration_days} Days</p></div>
            <div><p className="text-white/80 mb-1">Budget</p><p className="text-3xl font-bold capitalize">{itinerary.budget}</p></div>
            <div><p className="text-white/80 mb-1">Created On</p><p className="text-3xl font-bold">{new Date(itinerary.generated_at).toLocaleDateString()}</p></div>
          </div>
          {itinerary.summary && <p className="mt-6 text-white/90">{itinerary.summary}</p>}
        </div>

        <div className="space-y-6">
          {itinerary.days.map((day) => (
            <div key={day.day_number} className="bg-white rounded-2xl shadow-warm-lg overflow-hidden border border-neutral-100">
              <div className="bg-gradient-to-r from-primary to-secondary text-white px-6 py-4">
                <h2 className="text-2xl font-bold font-serif">Day {day.day_number}</h2>
                <p className="text-white/90">{day.theme}</p>
              </div>

              <div className="p-6 space-y-6">
                <ActivityBlock icon={<Sun className="w-5 h-5 text-yellow-500" />} title="Morning" value={day.morning} accent="border-yellow-400" />
                <ActivityBlock icon={<CloudRain className="w-5 h-5 text-blue-500" />} title="Afternoon" value={day.afternoon} accent="border-blue-400" />
                <ActivityBlock icon={<Moon className="w-5 h-5 text-secondary" />} title="Evening" value={day.evening} accent="border-secondary" />

                {day.accommodation && (
                  <div className="bg-neutral-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Home className="w-5 h-5 text-neutral-600" />
                      <h4 className="font-semibold text-neutral-800">Accommodation</h4>
                    </div>
                    <p className="text-neutral-700">{day.accommodation}</p>
                  </div>
                )}

                {day.estimated_cost !== null && (
                  <div className="flex items-center gap-2 text-secondary font-medium">
                    <DollarSign className="w-4 h-4" />
                    Estimated cost: {day.estimated_cost}
                  </div>
                )}

                {day.tips && (
                  <div className="bg-primary/5 rounded-lg p-4 border-l-4 border-primary">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-neutral-800">Tips</h4>
                    </div>
                    <p className="text-sm text-neutral-700">{day.tips}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityBlock({ icon, title, value, accent }: { icon: React.ReactNode; title: string; value: string; accent: string }) {
  return (
    <div className={`border-l-4 ${accent} pl-6`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-lg font-bold text-neutral-800">{title}</h3>
      </div>
      <p className="text-neutral-600">{value}</p>
    </div>
  );
}

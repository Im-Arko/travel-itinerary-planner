import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Destination, destinationsApi } from '../services/api';
import { destinationImage, errorMessage, parseTags, titleCase } from '../utils/formatters';
import { MapPin, DollarSign, Thermometer, Tag, ArrowLeft, Sparkles, Calendar, Globe2 } from 'lucide-react';

export function DestinationDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/login');
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;

    setIsLoading(true);
    setError('');
    destinationsApi.get(Number(id))
      .then(setDestination)
      .catch(err => setError(errorMessage(err, 'Destination not found.')))
      .finally(() => setIsLoading(false));
  }, [id, isAuthenticated]);

  if (loading || isLoading) return null;

  if (error || !destination) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neutral-800 mb-2 font-serif">{error || 'Destination not found.'}</h2>
          <Link to="/destinations" className="text-primary hover:text-primary/80">Back to Destinations</Link>
        </div>
      </div>
    );
  }

  const tags = parseTags(destination.tags);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="relative h-96 overflow-hidden">
        <img src={destinationImage(destination)} alt={destination.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <Link to="/destinations" className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition-colors shadow-warm">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </Link>

        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-5xl font-bold text-white mb-2 font-serif">{destination.name}</h1>
            <div className="flex items-center gap-2 text-white text-lg">
              <MapPin className="w-5 h-5" />
              {destination.country}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <div className="bg-white rounded-xl shadow-warm-lg p-8 border border-neutral-100">
              <h2 className="text-2xl font-bold text-neutral-800 mb-4 font-serif">About</h2>
              <p className="text-neutral-600 leading-relaxed text-lg">{destination.description}</p>
            </div>

            <div className="bg-white rounded-xl shadow-warm-lg p-8 border border-neutral-100">
              <h2 className="text-2xl font-bold text-neutral-800 mb-4 font-serif">Interests & Activities</h2>
              <div className="flex flex-wrap gap-3">
                {tags.length > 0 ? tags.map(tag => (
                  <span key={tag} className="px-4 py-2 bg-primary/10 text-primary rounded-full font-medium capitalize">{tag}</span>
                )) : <span className="text-neutral-600">No tags available.</span>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-warm-lg p-6 border border-neutral-100">
              <h3 className="text-lg font-bold text-neutral-800 mb-4 font-serif">Quick Facts</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-primary mt-0.5" />
                  <div><p className="text-sm text-neutral-600">Budget Level</p><p className="font-semibold text-neutral-800">{titleCase(destination.budget_level)}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Thermometer className="w-5 h-5 text-primary mt-0.5" />
                  <div><p className="text-sm text-neutral-600">Climate</p><p className="font-semibold text-neutral-800">{titleCase(destination.climate_type)}</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <Tag className="w-5 h-5 text-primary mt-0.5" />
                  <div><p className="text-sm text-neutral-600">Type</p><p className="font-semibold text-neutral-800">{titleCase(destination.destination_type)}</p></div>
                </div>
                {destination.best_months && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary mt-0.5" />
                    <div><p className="text-sm text-neutral-600">Best Months</p><p className="font-semibold text-neutral-800">{destination.best_months}</p></div>
                  </div>
                )}
                {destination.continent && (
                  <div className="flex items-start gap-3">
                    <Globe2 className="w-5 h-5 text-primary mt-0.5" />
                    <div><p className="text-sm text-neutral-600">Continent</p><p className="font-semibold text-neutral-800">{destination.continent}</p></div>
                  </div>
                )}
              </div>
            </div>

            <Link to={`/generate?destination=${encodeURIComponent(destination.name)}`} className="block w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:from-primary/90 hover:to-secondary/90 transition-all shadow-warm-lg ring-1 ring-white/20 ring-inset text-center">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span>Generate Itinerary</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

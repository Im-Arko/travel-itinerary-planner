import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Destination, destinationsApi } from '../services/api';
import { destinationImage, errorMessage, parseTags, titleCase } from '../utils/formatters';
import { Search, Filter, MapPin, DollarSign, Thermometer, Tag, Database, AlertCircle } from 'lucide-react';

export function DestinationsPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [budgetFilter, setBudgetFilter] = useState<string>('all');
  const [climateFilter, setClimateFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();
    const loadDestinations = async () => {
      setIsLoading(true);
      setError('');
      try {
        const params = {
          budget: budgetFilter === 'all' ? undefined : budgetFilter,
          climate: climateFilter === 'all' ? undefined : climateFilter,
          dest_type: typeFilter === 'all' ? undefined : typeFilter,
          limit: 50,
        };

        if (searchQuery.trim()) {
          const results = await destinationsApi.search({
            q: searchQuery.trim(),
            ...params,
            limit: 20,
          });
          if (!controller.signal.aborted) {
            setDestinations(results.map(result => result.destination));
          }
        } else {
          const data = await destinationsApi.list(params);
          if (!controller.signal.aborted) setDestinations(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(errorMessage(err, 'Unable to load destinations.'));
          setDestinations([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    const timeout = window.setTimeout(loadDestinations, searchQuery ? 300 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [budgetFilter, climateFilter, isAuthenticated, searchQuery, typeFilter]);

  const handleIngest = async () => {
    setIsIngesting(true);
    setError('');
    try {
      await destinationsApi.ingest();
    } catch (err) {
      setError(errorMessage(err, 'Unable to ingest destinations into the vector store.'));
    } finally {
      setIsIngesting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-neutral-800 mb-3 font-serif">Explore Destinations</h1>
            <p className="text-lg text-neutral-600">
              Search backend destinations with filters and vector search.
            </p>
          </div>
          <button
            type="button"
            onClick={handleIngest}
            disabled={isIngesting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-3 font-semibold text-white shadow-warm transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Database className="h-5 w-5" />
            {isIngesting ? 'Ingesting...' : 'Ingest Destinations'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-warm p-4 mb-6 border border-neutral-100">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Try tropical beaches, mountain adventures, or cultural cities..."
              className="w-full pl-12 pr-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-warm p-6 mb-8 border border-neutral-100">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-neutral-600" />
            <h2 className="text-lg font-semibold text-neutral-800">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
                <DollarSign className="w-4 h-4 text-primary-600" />
                Budget
              </label>
              <select value={budgetFilter} onChange={(e) => setBudgetFilter(e.target.value)} className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option value="all">All Budgets</option>
                <option value="budget">Budget</option>
                <option value="moderate">Moderate</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
                <Thermometer className="w-4 h-4 text-primary-600" />
                Climate
              </label>
              <select value={climateFilter} onChange={(e) => setClimateFilter(e.target.value)} className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option value="all">All Climates</option>
                <option value="tropical">Tropical</option>
                <option value="temperate">Temperate</option>
                <option value="arid">Arid</option>
                <option value="cold">Cold</option>
                <option value="mediterranean">Mediterranean</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
                <Tag className="w-4 h-4 text-primary-600" />
                Type
              </label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option value="all">All Types</option>
                <option value="city">City</option>
                <option value="beach">Beach</option>
                <option value="mountain">Mountain</option>
                <option value="countryside">Countryside</option>
                <option value="adventure">Adventure</option>
                <option value="cultural">Cultural</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-6">
          <p className="text-neutral-600">
            {isLoading ? 'Loading destinations...' : <>Found <span className="font-semibold text-neutral-800">{destinations.length}</span> destinations</>}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map(destination => {
            const tags = parseTags(destination.tags);
            return (
              <Link key={destination.id} to={`/destinations/${destination.id}`} className="bg-white rounded-xl shadow-warm hover:shadow-warm-lg transition-shadow overflow-hidden group border border-neutral-100">
                <div className="relative h-48 overflow-hidden">
                  <img src={destinationImage(destination)} alt={destination.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium capitalize border border-neutral-200">
                    {titleCase(destination.budget_level)}
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-xl font-bold text-neutral-800 mb-1 font-serif">{destination.name}</h3>
                  <div className="flex items-center gap-1 text-neutral-600 text-sm mb-3">
                    <MapPin className="w-4 h-4" />
                    {destination.country}
                  </div>

                  <p className="text-neutral-600 text-sm mb-3 line-clamp-2">{destination.description}</p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-full font-medium">{tag}</span>
                    ))}
                    {tags.length > 3 && <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-full">+{tags.length - 3}</span>}
                  </div>

                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>{titleCase(destination.climate_type)}</span>
                    <span>{titleCase(destination.destination_type)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {!isLoading && destinations.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block p-4 bg-neutral-100 rounded-full mb-4">
              <Search className="w-12 h-12 text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-800 mb-2 font-serif">No destinations found</h3>
            <p className="text-neutral-600">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

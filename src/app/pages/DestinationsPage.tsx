import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Destination, destinationsApi, DestinationSearchResult } from '../services/api';
import { destinationImage, errorMessage, parseTags, titleCase } from '../utils/formatters';
import {
  Search, SlidersHorizontal, MapPin, DollarSign, Thermometer,
  Tag, Database, AlertCircle, ArrowRight, Heart, Sparkles,
} from 'lucide-react';

const budgetColor: Record<string, string> = {
  budget:   'bg-forest-50 text-forest-700 border-forest-100',
  moderate: 'bg-sky-50    text-sky-700    border-sky-100',
  luxury:   'bg-primary-50 text-primary-700 border-primary-100',
};

export function DestinationsPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery,   setSearchQuery]   = useState('');
  const [budgetFilter,  setBudgetFilter]  = useState('all');
  const [climateFilter, setClimateFilter] = useState('all');
  const [typeFilter,    setTypeFilter]    = useState('all');
  const [destinations,  setDestinations]  = useState<Destination[]>([]);
  const [similarityScores, setSimilarityScores] = useState<Record<number, { score: number; reason: string }>>({});
  const [isLoading,     setIsLoading]     = useState(false);
  const [isIngesting,   setIsIngesting]   = useState(false);
  const [error,         setError]         = useState('');

  // Sample "liked" destinations for similarity demo
  const sampleLikedDestinations = ['Paris', 'Tokyo', 'Bali'];
  const sampleSimilarReasons = [
    'Because you liked Paris',
    'Similar to your style',
    'Matches your preferences',
    'Based on Tokyo',
    'Inspired by Bali',
  ];

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/login');
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const params = {
          budget:    budgetFilter  === 'all' ? undefined : budgetFilter,
          climate:   climateFilter === 'all' ? undefined : climateFilter,
          dest_type: typeFilter    === 'all' ? undefined : typeFilter,
          limit: 50,
        };

        if (searchQuery.trim()) {
          const results = await destinationsApi.search({ q: searchQuery.trim(), ...params, limit: 20 });
          if (!controller.signal.aborted) {
            setDestinations(results.map(r => r.destination));
            // Store similarity scores for badges
            const scores: Record<number, { score: number; reason: string }> = {};
            results.forEach((r: DestinationSearchResult, idx: number) => {
              scores[r.destination.id] = {
                score: Math.round(r.similarity_score * 100),
                reason: sampleSimilarReasons[idx % sampleSimilarReasons.length],
              };
            });
            setSimilarityScores(scores);
          }
        } else {
          const data = await destinationsApi.list(params);
          if (!controller.signal.aborted) {
            setDestinations(data);
            // Randomly assign similarity badges to some destinations
            const scores: Record<number, { score: number; reason: string }> = {};
            data.forEach((d, idx) => {
              if (Math.random() > 0.5) {
                scores[d.id] = {
                  score: Math.floor(75 + Math.random() * 20),
                  reason: sampleSimilarReasons[idx % sampleSimilarReasons.length],
                };
              }
            });
            setSimilarityScores(scores);
          }
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

    const timeout = window.setTimeout(load, searchQuery ? 300 : 0);
    return () => { controller.abort(); window.clearTimeout(timeout); };
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
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="page-header">Explore destinations</h1>
          <p className="page-sub">Find your next adventure</p>
        </div>
        {/*
        <button
          onClick={handleIngest}
          disabled={isIngesting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-transparent text-primary-600 font-sans font-medium rounded-xl border-2 border-primary-400 transition-all duration-200 hover:bg-primary-50 hover:border-primary-500 active:scale-[0.98] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Database className="w-4 h-4" />
          {isIngesting ? 'Ingesting…' : 'Ingest destinations'}
        </button>
        */}
      </div>

      {/* ── Unified Search Panel ── */}
      <div className="card p-5 mb-8">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sand-300 pointer-events-none" />
            <input
              type="text"
              placeholder="Try 'tropical beaches', 'mountain adventures', or 'cultural cities'…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input pl-12 py-3.5 text-base"
            />
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px h-8 bg-sand-200" />

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="flex items-center gap-1.5 text-sm font-medium text-sand-400 font-sans shrink-0">
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </span>

            {/* Budget */}
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-400 pointer-events-none" />
              <select
                value={budgetFilter}
                onChange={e => setBudgetFilter(e.target.value)}
                className="pl-8 pr-7 py-2.5 bg-sand-50 border border-sand-200 rounded-lg text-sm text-sand-700 font-sans appearance-none cursor-pointer focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
              >
                <option value="all">All Budgets</option>
                <option value="budget">Low</option>
                <option value="moderate">Moderate</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>

            {/* Climate */}
            <div className="relative">
              <Thermometer className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-400 pointer-events-none" />
              <select
                value={climateFilter}
                onChange={e => setClimateFilter(e.target.value)}
                className="pl-8 pr-7 py-2.5 bg-sand-50 border border-sand-200 rounded-lg text-sm text-sand-700 font-sans appearance-none cursor-pointer focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
              >
                <option value="all">All Climates</option>
                <option value="tropical">Tropical</option>
                <option value="temperate">Temperate</option>
                <option value="arid">Arid</option>
                <option value="cold">Cold</option>
                <option value="mediterranean">Mediterranean</option>
              </select>
            </div>

            {/* Type */}
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-400 pointer-events-none" />
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="pl-8 pr-7 py-2.5 bg-sand-50 border border-sand-200 rounded-lg text-sm text-sand-700 font-sans appearance-none cursor-pointer focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
              >
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
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-sand-400 font-sans mb-6">
        {isLoading ? 'Loading…' : (
          <>Found <span className="font-semibold text-sand-700">{destinations.length}</span> destinations</>
        )}
      </p>

      {/* Grid */}
      {!isLoading && destinations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          {/* Illustrated empty state */}
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-sand-100 flex items-center justify-center mx-auto">
              <div className="relative">
                <Search className="w-12 h-12 text-primary-400" />
                {/* Decorative magnifying glass handle */}
                <div className="absolute -bottom-3 -right-3 w-2 h-6 bg-primary-300 rounded-full rotate-45" />
              </div>
            </div>
          </div>

          <h3 className="font-serif text-xl font-semibold text-sand-700 mb-2">No destinations found</h3>
          <p className="text-sand-500 text-sm max-w-sm mb-6">
            We couldn't find any destinations matching your criteria. Try adjusting your search or filters.
          </p>

          {/* Quick reset button */}
          <button
            onClick={() => {
              setSearchQuery('');
              setBudgetFilter('all');
              setClimateFilter('all');
              setTypeFilter('all');
            }}
            className="inline-flex items-center gap-2 px-6 py-3 text-primary-600 font-medium hover:text-primary-700 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-45" />
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map(d => {
            const tags = parseTags(d.tags);
            return (
              <Link
                key={d.id}
                to={`/destinations/${d.id}`}
                className="card group hover:shadow-warm-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={destinationImage(d)}
                    alt={d.name}
                    className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border backdrop-blur-sm ${budgetColor[d.budget_level] ?? 'bg-white/90 text-sand-700 border-sand-100'}`}>
                      {titleCase(d.budget_level)}
                    </span>
                    {/* Similarity badge - forest green */}
                    {similarityScores[d.id] && (
                      <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-forest-100 text-forest-700 border border-forest-200 backdrop-blur-sm">
                        <Sparkles className="w-3 h-3" />
                        {similarityScores[d.id].reason}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-5">
                  <h3 className="font-serif text-lg font-semibold text-sand-800 leading-tight">{d.name}</h3>
                  <p className="flex items-center gap-1 text-xs text-sand-400 mt-0.5 mb-3 font-sans">
                    <MapPin className="w-3 h-3" /> {d.country}
                  </p>
                  <p className="text-sm text-sand-500 leading-relaxed line-clamp-2 mb-4 font-sans">
                    {d.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {tags.slice(0, 3).map(tag => <span key={tag} className="tag">{tag}</span>)}
                    {tags.length > 3 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 bg-sand-100 text-sand-500 text-xs font-medium rounded-full">
                        +{tags.length - 3}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-primary-500 text-sm font-medium font-sans gap-1 group-hover:gap-2 transition-all">
                    View details <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
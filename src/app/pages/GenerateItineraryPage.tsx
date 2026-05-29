import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { destinationsApi, itinerariesApi, ItineraryWithDays } from '../services/api';
import { errorMessage, normalizeBudget, normalizeClimate, normalizeDestinationType } from '../utils/formatters';
import { Sparkles, MapPin, Calendar, DollarSign, Loader, AlertCircle, Heart, Database, CheckCircle, Wand2, Clock, Users, Globe, ArrowRight } from 'lucide-react';
import { Slider } from '@mui/material';

const budgets = ['budget', 'moderate', 'luxury'];
const climates = ['any', 'tropical', 'temperate', 'arid', 'cold', 'mediterranean'];
const destinationTypes = ['any', 'beach', 'mountain', 'city', 'countryside', 'adventure', 'cultural'];
const travelStyles = ['solo', 'couple', 'family', 'adventure', 'cultural', 'relaxation', 'luxury', 'budget'];

// Preference tag cloud for visual personalization
const preferenceTagCloud = [
  { emoji: '🏖️', label: 'Beaches', key: 'beaches' },
  { emoji: '🍜', label: 'Food', key: 'food' },
  { emoji: '🥾', label: 'Hiking', key: 'hiking' },
  { emoji: '🏛️', label: 'History', key: 'history' },
  { emoji: '🎨', label: 'Art', key: 'art' },
  { emoji: '🌙', label: 'Nightlife', key: 'nightlife' },
  { emoji: '🧘', label: 'Wellness', key: 'wellness' },
  { emoji: '📸', label: 'Photography', key: 'photography' },
  { emoji: '🦁', label: 'Wildlife', key: 'wildlife' },
  { emoji: '🏔️', label: 'Mountains', key: 'mountains' },
];

const interestOptions = ['Beach', 'Mountains', 'Cities', 'History', 'Food', 'Art', 'Shopping', 'Nightlife', 'Wildlife', 'Photography', 'Wellness', 'Adventure Sports'];

export function GenerateItineraryPage() {
  const { isAuthenticated, loading } = useAuth();
  const { preferences } = usePreferences();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [destinationHint, setDestinationHint] = useState(searchParams.get('destination') || preferences?.destinationHint || '');
  const [duration, setDuration] = useState(preferences?.tripDuration || 7);
  const [budget, setBudget] = useState(normalizeBudget(preferences?.budget));
  const [climate, setClimate] = useState(normalizeClimate(preferences?.climate));
  const [destinationType, setDestinationType] = useState('any');
  const [travelStyle, setTravelStyle] = useState(preferences?.travelStyle || 'solo');
  const [interests, setInterests] = useState<string[]>(preferences?.interests || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidatingPipeline, setIsValidatingPipeline] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState('');
  const [generatedItinerary, setGeneratedItinerary] = useState<ItineraryWithDays | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/login');
  }, [isAuthenticated, loading, navigate]);

  const toggleInterest = (interest: string) => {
    setInterests(prev => prev.includes(interest) ? prev.filter(item => item !== interest) : [...prev, interest]);
  };

  const validatePipeline = async () => {
    setIsValidatingPipeline(true);
    setError('');
    try {
      const current = await destinationsApi.vectorCount();
      if (current.count > 0) {
        setPipelineStatus(`Vector store ready with ${current.count} destinations.`);
        return;
      }

      const ingestResult = await destinationsApi.ingest();
      const refreshed = await destinationsApi.vectorCount();
      setPipelineStatus(`${ingestResult.message}. Vector store now has ${refreshed.count} destinations.`);
    } catch (err) {
      setPipelineStatus('');
      setError(errorMessage(err, 'Unable to validate vector ingestion pipeline.'));
    } finally {
      setIsValidatingPipeline(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      validatePipeline();
    }
  }, [isAuthenticated]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGeneratedItinerary(null);
    setError('');

    try {
      const current = await destinationsApi.vectorCount();
      if (current.count === 0) {
        await destinationsApi.ingest();
      }

      const result = await itinerariesApi.generate({
        budget: normalizeBudget(budget),
        preferred_climate: normalizeClimate(climate),
        destination_type: normalizeDestinationType(destinationType),
        trip_duration: duration,
        travel_style: travelStyle,
        interests,
        destination_hint: destinationHint || undefined,
      });
      setGeneratedItinerary(result);
    } catch (err) {
      setError(errorMessage(err, 'Unable to generate itinerary.'));
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-sm font-sans mb-4">
            <Sparkles className="w-4 h-4" />
            AI-Powered Trip Planning
          </div>
          <h1 className="font-serif text-4xl font-bold text-sand-800 mb-3">Generate Your Itinerary</h1>
          <p className="text-sand-500 font-sans text-lg max-w-2xl mx-auto">
            Find your next adventure with personalized itineraries crafted by advanced AI and semantic search.
          </p>
        </div>

        {/* Preference Tag Cloud */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {preferenceTagCloud.map((tag) => (
            <button
              key={tag.key}
              type="button"
              className="group flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-sand-200 text-sand-600 text-sm font-medium transition-all duration-200 hover:bg-primary-500 hover:border-primary-400 hover:text-white hover:shadow-md"
            >
              <span className="text-base">{tag.emoji}</span>
              {tag.label}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-warm-lg p-8 border border-sand-100">
              <h2 className="font-serif text-2xl font-bold text-sand-800 mb-6 flex items-center gap-2">
                <Wand2 className="w-6 h-6 text-primary-500" />
                Trip Details
              </h2>

              <form onSubmit={handleGenerate} className="space-y-6">
                {/* Destination Hint */}
                <div>
                  <label className="flex items-center gap-2 text-sand-700 font-semibold mb-3">
                    <MapPin className="w-5 h-5 text-primary-500" />
                    Destination Hint
                  </label>
                  <input
                    value={destinationHint}
                    onChange={(e) => setDestinationHint(e.target.value)}
                    className="input py-3 text-base"
                    placeholder="Paris, tropical beaches, mountain towns..."
                  />
                </div>

                {/* Duration Slider */}
                <div>
                  <label className="flex items-center gap-2 text-sand-700 font-semibold mb-3">
                    <Clock className="w-5 h-5 text-primary-500" />
                    Duration: <span className="text-primary-600">{duration} days</span>
                  </label>
                  <Slider value={duration} onChange={(_, value) => setDuration(value as number)} min={1} max={30} sx={{ color: '#c84b31' }} />
                  <div className="flex justify-between text-xs text-sand-400 mt-1">
                    <span>1 day</span>
                    <span>30 days</span>
                  </div>
                </div>

                {/* Grid of selects */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Budget */}
                  <div>
                    <label className="flex items-center gap-2 text-sand-700 font-semibold mb-3">
                      <DollarSign className="w-5 h-5 text-primary-500" />
                      Budget
                    </label>
                    <select value={budget} onChange={(e) => setBudget(e.target.value)} className="input py-3" required>
                      {budgets.map(option => <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>)}
                    </select>
                  </div>

                  {/* Climate */}
                  <div>
                    <label className="flex items-center gap-2 text-sand-700 font-semibold mb-3">
                      <Globe className="w-5 h-5 text-primary-500" />
                      Climate
                    </label>
                    <select value={climate} onChange={(e) => setClimate(e.target.value)} className="input py-3">
                      {climates.map(option => <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>)}
                    </select>
                  </div>

                  {/* Destination Type */}
                  <div>
                    <label className="flex items-center gap-2 text-sand-700 font-semibold mb-3">
                      <MapPin className="w-5 h-5 text-primary-500" />
                      Type
                    </label>
                    <select value={destinationType} onChange={(e) => setDestinationType(e.target.value)} className="input py-3">
                      {destinationTypes.map(option => <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>)}
                    </select>
                  </div>

                  {/* Travel Style */}
                  <div>
                    <label className="flex items-center gap-2 text-sand-700 font-semibold mb-3">
                      <Users className="w-5 h-5 text-primary-500" />
                      Travel Style
                    </label>
                    <select value={travelStyle} onChange={(e) => setTravelStyle(e.target.value)} className="input py-3">
                      {travelStyles.map(option => <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>)}
                    </select>
                  </div>
                </div>

                {/* Interests - Pill chips style */}
                <div>
                  <label className="flex items-center gap-2 text-sand-700 font-semibold mb-3">
                    <Heart className="w-5 h-5 text-primary-500" />
                    Your Interests
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {interestOptions.map(interest => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                          interests.includes(interest)
                            ? 'bg-primary-500 text-white shadow-md'
                            : 'bg-sand-100 text-sand-600 hover:bg-primary-50 hover:text-primary-600'
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-secondary-600 transition-all shadow-warm-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ring-1 ring-white/20 ring-inset group"
                >
                  {isGenerating ? (
                    <><Loader className="w-5 h-5 animate-spin" /> Generating your adventure...</>
                  ) : (
                    <><Wand2 className="w-5 h-5" /> Generate Itinerary <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar - Status & Preview */}
          <div className="space-y-6">
            {/* Vector Pipeline Status 
            <div className="bg-white rounded-2xl shadow-warm p-6 border border-sand-100">
              <div className="flex items-center gap-2 font-semibold text-sand-800 mb-3">
                <Database className="w-5 h-5 text-primary-500" />
                Vector Pipeline
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-sand-500">Status</span>
                <button
                  type="button"
                  onClick={validatePipeline}
                  disabled={isValidatingPipeline}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors disabled:opacity-50"
                >
                  {isValidatingPipeline ? 'Checking...' : 'Validate'}
                </button>
              </div>
              {pipelineStatus ? (
                <div className="flex items-center gap-2 text-sm text-forest-700 bg-forest-50 p-3 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                  {pipelineStatus}
                </div>
              ) : (
                <p className="text-sm text-sand-400">Verify vector store is ready</p>
              )}
            </div>
              */}
            {/* Generation Status */}
            {isGenerating && (
              <div className="bg-white rounded-2xl shadow-warm p-6 border border-sand-100 text-center">
                <div className="inline-block p-4 bg-primary-50 rounded-full mb-4 animate-pulse">
                  <Sparkles className="w-10 h-10 text-primary-500" />
                </div>
                <h3 className="font-serif text-xl font-bold text-sand-800 mb-2">Creating Your Trip</h3>
                <p className="text-sand-500 text-sm">AI is searching destinations and crafting your day-by-day itinerary...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                  <AlertCircle className="w-5 h-5" />
                  Generation Failed
                </div>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {generatedItinerary && !isGenerating && (
              <div className="bg-white rounded-2xl shadow-warm p-6 border border-sand-100">
                <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl p-4 mb-4 ring-1 ring-white/20 ring-inset">
                  <h3 className="font-serif text-lg font-bold mb-1">{generatedItinerary.title}</h3>
                  <p className="text-white/90 text-sm line-clamp-2">{generatedItinerary.summary}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div className="bg-sand-50 p-3 rounded-lg">
                    <p className="text-sand-400 text-xs">Destination</p>
                    <p className="font-semibold text-sand-800">{generatedItinerary.destination_name}</p>
                  </div>
                  <div className="bg-sand-50 p-3 rounded-lg">
                    <p className="text-sand-400 text-xs">Duration</p>
                    <p className="font-semibold text-sand-800">{generatedItinerary.duration_days} days</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/itineraries/${generatedItinerary.id}`)}
                  className="w-full py-3 bg-sand-800 text-white rounded-lg font-medium hover:bg-sand-900 transition-colors flex items-center justify-center gap-2"
                >
                  View Full Itinerary <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {!isGenerating && !error && !generatedItinerary && (
              <div className="bg-white rounded-2xl shadow-warm p-6 border border-sand-100 text-center">
                <div className="inline-block p-3 bg-sand-100 rounded-full mb-3">
                  <Sparkles className="w-8 h-8 text-sand-400" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-sand-800 mb-1">Ready to Generate</h3>
                <p className="text-sand-500 text-sm">Fill out the form and let AI craft your perfect trip.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

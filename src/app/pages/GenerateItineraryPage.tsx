import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { destinationsApi, itinerariesApi, ItineraryWithDays } from '../services/api';
import { errorMessage, normalizeBudget, normalizeClimate, normalizeDestinationType } from '../utils/formatters';
import { Sparkles, MapPin, Calendar, DollarSign, Loader, AlertCircle, Heart, Database, CheckCircle } from 'lucide-react';
import { Slider } from '@mui/material';

const budgets = ['budget', 'moderate', 'luxury'];
const climates = ['any', 'tropical', 'temperate', 'arid', 'cold', 'mediterranean'];
const destinationTypes = ['any', 'beach', 'mountain', 'city', 'countryside', 'adventure', 'cultural'];
const travelStyles = ['solo', 'couple', 'family', 'adventure', 'cultural', 'relaxation', 'luxury', 'budget'];
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
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-neutral-800 mb-3 font-serif">Generate Your Itinerary</h1>
            <p className="text-lg text-neutral-600">Create a backend-generated itinerary using vector search and the LLM service.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-warm-lg p-8 border border-neutral-100">
              <h2 className="text-2xl font-bold text-neutral-800 mb-6 font-serif">Trip Details</h2>

              <form onSubmit={handleGenerate} className="space-y-6">
                <div>
                  <label className="flex items-center gap-2 text-neutral-800 font-semibold mb-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    Destination Hint
                  </label>
                  <input
                    value={destinationHint}
                    onChange={(e) => setDestinationHint(e.target.value)}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Paris, tropical beaches, mountain towns..."
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-neutral-800 font-semibold mb-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    Duration: {duration} days
                  </label>
                  <Slider value={duration} onChange={(_, value) => setDuration(value as number)} min={1} max={30} sx={{ color: '#c84b31' }} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-neutral-800 font-semibold mb-3">
                      <DollarSign className="w-5 h-5 text-primary" />
                      Budget
                    </label>
                    <select value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" required>
                      {budgets.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-800 font-semibold mb-3">Climate</label>
                    <select value={climate} onChange={(e) => setClimate(e.target.value)} className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary">
                      {climates.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-800 font-semibold mb-3">Destination Type</label>
                    <select value={destinationType} onChange={(e) => setDestinationType(e.target.value)} className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary">
                      {destinationTypes.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-800 font-semibold mb-3">Travel Style</label>
                    <select value={travelStyle} onChange={(e) => setTravelStyle(e.target.value)} className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary">
                      {travelStyles.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-neutral-800 font-semibold mb-3">
                    <Heart className="w-5 h-5 text-primary" />
                    Interests
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {interestOptions.map(interest => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${interests.includes(interest) ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={isGenerating} className="w-full py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold hover:from-primary/90 hover:to-secondary/90 transition-all shadow-warm-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ring-1 ring-white/20 ring-inset">
                  {isGenerating ? <><Loader className="w-5 h-5 animate-spin" />Generating...</> : <><Sparkles className="w-5 h-5" />Generate Itinerary</>}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-warm-lg p-8 border border-neutral-100">
              <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-semibold text-neutral-800">
                    <Database className="h-5 w-5 text-primary" />
                    Vector Pipeline
                  </div>
                  <button
                    type="button"
                    onClick={validatePipeline}
                    disabled={isValidatingPipeline}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isValidatingPipeline ? 'Checking...' : 'Validate'}
                  </button>
                </div>
                {pipelineStatus ? (
                  <p className="flex items-center gap-2 text-sm text-neutral-700">
                    <CheckCircle className="h-4 w-4 text-secondary" />
                    {pipelineStatus}
                  </p>
                ) : (
                  <p className="text-sm text-neutral-600">Checks vector count and ingests destinations when needed.</p>
                )}
              </div>

              {isGenerating && (
                <div className="text-center py-12">
                  <div className="inline-block p-4 bg-primary/10 rounded-full mb-4 animate-pulse">
                    <Sparkles className="w-12 h-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-800 mb-4 font-serif">Creating Your Trip</h3>
                  <p className="text-neutral-600">The backend is searching destinations and generating a day-wise itinerary.</p>
                </div>
              )}

              {!isGenerating && error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <AlertCircle className="h-5 w-5" />
                    Generation failed
                  </div>
                  <p>{error}</p>
                </div>
              )}

              {!isGenerating && !error && !generatedItinerary && (
                <div className="text-center py-12">
                  <div className="inline-block p-4 bg-neutral-100 rounded-full mb-4">
                    <Sparkles className="w-12 h-12 text-neutral-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-neutral-800 mb-2 font-serif">Ready to Generate</h3>
                  <p className="text-neutral-600">Fill out the form to call the backend generator.</p>
                </div>
              )}

              {generatedItinerary && !isGenerating && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl p-6 ring-1 ring-white/20 ring-inset">
                    <h3 className="text-2xl font-bold mb-2 font-serif">{generatedItinerary.title}</h3>
                    <p className="text-white/90">{generatedItinerary.summary}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-lg bg-neutral-50 p-4">
                      <p className="text-neutral-500">Destination</p>
                      <p className="font-semibold text-neutral-800">{generatedItinerary.destination_name}</p>
                    </div>
                    <div className="rounded-lg bg-neutral-50 p-4">
                      <p className="text-neutral-500">Duration</p>
                      <p className="font-semibold text-neutral-800">{generatedItinerary.duration_days} days</p>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/itineraries/${generatedItinerary.id}`)} className="w-full py-3 bg-neutral-800 text-white rounded-lg font-semibold hover:bg-neutral-900 transition-all">
                    View Full Itinerary
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

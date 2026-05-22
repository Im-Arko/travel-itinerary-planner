import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences, UserPreferences } from '../context/PreferencesContext';
import { preferencesApi } from '../services/api';
import { errorMessage, normalizeBudget, normalizeClimate } from '../utils/formatters';
import { Slider } from '@mui/material';
import { Settings, Heart, DollarSign, Calendar, Thermometer, MapPin, Save, AlertCircle, Sparkles, CheckCircle, Wand2, Users, Globe } from 'lucide-react';

// Emoji mapping for interests
const interestEmojis: Record<string, string> = {
  Beach: '🏖️',
  Mountains: '🏔️',
  Cities: '🏙️',
  History: '🏛️',
  Food: '🍜',
  Art: '🎨',
  Shopping: '🛍️',
  Nightlife: '🌙',
  Wildlife: '🦁',
  Photography: '📸',
  Wellness: '🧘',
  'Adventure Sports': '🥾',
};

const travelStyles = ['solo', 'couple', 'family', 'adventure', 'cultural', 'relaxation', 'luxury', 'budget'];
const budgetRanges = ['budget', 'moderate', 'luxury'];
const climates = ['any', 'tropical', 'temperate', 'arid', 'cold', 'mediterranean'];
const interestOptions = [
  'Beach', 'Mountains', 'Cities', 'History', 'Food', 'Art',
  'Shopping', 'Nightlife', 'Wildlife', 'Photography', 'Wellness', 'Adventure Sports'
];

export function PreferencesPage() {
  const { isAuthenticated, loading } = useAuth();
  const { preferences, savePreferences } = usePreferences();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<UserPreferences>({
    travelStyle: preferences?.travelStyle || '',
    budget: normalizeBudget(preferences?.budget),
    tripDuration: preferences?.tripDuration || 7,
    climate: normalizeClimate(preferences?.climate),
    interests: preferences?.interests || [],
    destinationHint: preferences?.destinationHint || ''
  });

  const [isLoadingPrefs, setIsLoadingPrefs] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    setIsLoadingPrefs(true);
    preferencesApi.get()
      .then(pref => {
        const mapped = {
          travelStyle: pref.travel_style || '',
          budget: normalizeBudget(pref.budget),
          tripDuration: pref.trip_duration,
          climate: normalizeClimate(pref.preferred_climate),
          interests: pref.interests,
          destinationHint: '',
        };
        setFormData(mapped);
        savePreferences(mapped);
      })
      .catch(err => {
        const message = errorMessage(err, '');
        if (message && message !== 'Preferences not found') setError(message);
      })
      .finally(() => setIsLoadingPrefs(false));
  }, [isAuthenticated, savePreferences]);

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setError('');
    try {
      const saved = await preferencesApi.save({
        budget: normalizeBudget(formData.budget),
        preferred_climate: normalizeClimate(formData.climate),
        destination_type: 'any',
        trip_duration: formData.tripDuration,
        travel_style: formData.travelStyle,
        interests: formData.interests,
        dietary_needs: null,
        accessibility: false,
      });
      const mapped = {
        travelStyle: saved.travel_style,
        budget: normalizeBudget(saved.budget),
        tripDuration: saved.trip_duration,
        climate: normalizeClimate(saved.preferred_climate),
        interests: saved.interests,
        destinationHint: formData.destinationHint,
      };
      setFormData(mapped);
      savePreferences(mapped);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(errorMessage(err, 'Unable to save preferences.'));
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-sm font-sans mb-4">
            <Sparkles className="w-4 h-4" />
            Personalization
          </div>
          <h1 className="font-serif text-4xl font-bold text-sand-800 mb-3">Travel Preferences</h1>
          <p className="text-sand-500 font-sans text-lg max-w-xl mx-auto">
            Tell us about your travel style to get personalized AI recommendations
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-warm-lg p-8 space-y-8 border border-sand-100">
          {/* Success message */}
          {saveSuccess && (
            <div className="flex items-center gap-3 bg-forest-50 border border-forest-200 text-forest-700 px-4 py-3 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-forest-100 flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="font-medium">Preferences saved successfully!</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading state */}
          {isLoadingPrefs && (
            <div className="flex items-center gap-3 bg-sand-50 border border-sand-200 text-sand-600 px-4 py-3 rounded-xl">
              <div className="w-5 h-5 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
              <span>Loading your saved preferences...</span>
            </div>
          )}

          {/* Travel Style */}
          <div>
            <label className="flex items-center gap-2 text-sand-700 font-semibold mb-4">
              <Users className="w-5 h-5 text-primary-500" />
              Travel Style
            </label>
            <div className="flex flex-wrap gap-2">
              {travelStyles.map(style => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setFormData({ ...formData, travelStyle: style })}
                  className={`px-5 py-2.5 rounded-full font-medium transition-all duration-200 ${
                    formData.travelStyle === style
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-sand-100 text-sand-600 hover:bg-primary-50 hover:text-primary-600'
                  }`}
                >
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="flex items-center gap-2 text-sand-700 font-semibold mb-4">
              <DollarSign className="w-5 h-5 text-primary-500" />
              Budget Range
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {budgetRanges.map(range => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setFormData({ ...formData, budget: range })}
                  className={`px-5 py-4 rounded-xl font-medium transition-all duration-200 ${
                    formData.budget === range
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-sand-100 text-sand-600 hover:bg-primary-50 hover:text-primary-600'
                  }`}
                >
                  <span className="block text-lg">{range.charAt(0).toUpperCase() + range.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trip Duration */}
          <div>
            <label className="flex items-center gap-2 text-sand-700 font-semibold mb-4">
              <Calendar className="w-5 h-5 text-primary-500" />
              Trip Duration: <span className="text-primary-600">{formData.tripDuration} days</span>
            </label>
            <Slider
              value={formData.tripDuration}
              onChange={(_, value) => setFormData({ ...formData, tripDuration: value as number })}
              min={1}
              max={30}
              sx={{ color: '#c84b31' }}
            />
            <div className="flex justify-between text-xs text-sand-400 mt-2">
              <span>1 day</span>
              <span>30 days</span>
            </div>
          </div>

          {/* Climate Preference */}
          <div>
            <label className="flex items-center gap-2 text-sand-700 font-semibold mb-4">
              <Globe className="w-5 h-5 text-primary-500" />
              Preferred Climate
            </label>
            <div className="flex flex-wrap gap-2">
              {climates.map(climate => (
                <button
                  key={climate}
                  type="button"
                  onClick={() => setFormData({ ...formData, climate })}
                  className={`px-5 py-2.5 rounded-full font-medium transition-all duration-200 ${
                    formData.climate === climate
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-sand-100 text-sand-600 hover:bg-primary-50 hover:text-primary-600'
                  }`}
                >
                  {climate.charAt(0).toUpperCase() + climate.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Interests - Visual pill chips with emojis */}
          <div>
            <label className="flex items-center gap-2 text-sand-700 font-semibold mb-4">
              <Heart className="w-5 h-5 text-primary-500" />
              Your Interests
              <span className="text-sand-400 font-normal text-sm ml-2">(Select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map(interest => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all duration-200 ${
                    formData.interests.includes(interest)
                      ? 'bg-secondary-500 text-white shadow-md'
                      : 'bg-sand-100 text-sand-600 hover:bg-secondary-50 hover:text-secondary-600'
                  }`}
                >
                  <span className="text-base">{interestEmojis[interest] || ''}</span>
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Destination Hint */}
          <div>
            <label className="flex items-center gap-2 text-sand-700 font-semibold mb-4">
              <MapPin className="w-5 h-5 text-primary-500" />
              Destination Ideas
              <span className="text-sand-400 font-normal text-sm ml-2">(Optional)</span>
            </label>
            <textarea
              value={formData.destinationHint}
              onChange={(e) => setFormData({ ...formData, destinationHint: e.target.value })}
              className="input py-3 resize-none"
              rows={3}
              placeholder="e.g., 'I love tropical beaches in Southeast Asia' or 'Looking for mountain adventures in Europe'"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!formData.travelStyle || !formData.budget || !formData.climate}
            className="w-full py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-secondary-600 transition-all shadow-warm-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ring-1 ring-white/20 ring-inset group"
          >
            <Save className="w-5 h-5" />
            Save Preferences
            <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
}

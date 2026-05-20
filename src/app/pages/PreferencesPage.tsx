import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { usePreferences, UserPreferences } from '../context/PreferencesContext';
import { Slider } from '@mui/material';
import { Settings, Heart, DollarSign, Calendar, Thermometer, MapPin, Save } from 'lucide-react';

const travelStyles = ['Adventure', 'Luxury', 'Budget', 'Cultural', 'Relaxation', 'Family'];
const budgetRanges = ['Budget ($500-1500)', 'Moderate ($1500-3000)', 'Luxury ($3000+)'];
const climates = ['Tropical', 'Temperate', 'Arctic', 'Desert', 'Mediterranean', 'Mountain'];
const interestOptions = [
  'Beach', 'Mountains', 'Cities', 'History', 'Food', 'Art',
  'Shopping', 'Nightlife', 'Wildlife', 'Photography', 'Wellness', 'Adventure Sports'
];

export function PreferencesPage() {
  const { isAuthenticated } = useAuth();
  const { preferences, savePreferences } = usePreferences();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<UserPreferences>({
    travelStyle: preferences?.travelStyle || '',
    budget: preferences?.budget || '',
    tripDuration: preferences?.tripDuration || 7,
    climate: preferences?.climate || '',
    interests: preferences?.interests || [],
    destinationHint: preferences?.destinationHint || ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

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
    setIsSaving(true);
    setSaveSuccess(false);

    await new Promise(resolve => setTimeout(resolve, 1000));
    savePreferences(formData);
    setIsSaving(false);
    setSaveSuccess(true);

    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
            <Settings className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-3">Travel Preferences</h1>
          <p className="text-lg text-gray-600">
            Tell us about your travel style to get personalized recommendations
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          {saveSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <Save className="w-5 h-5" />
              <span>Preferences saved successfully!</span>
            </div>
          )}

          {/* Travel Style */}
          <div>
            <label className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
              <Heart className="w-5 h-5 text-blue-600" />
              Travel Style
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {travelStyles.map(style => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setFormData({ ...formData, travelStyle: style })}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    formData.travelStyle === style
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Budget Range
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {budgetRanges.map(range => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setFormData({ ...formData, budget: range })}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    formData.budget === range
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Trip Duration */}
          <div>
            <label className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              Trip Duration: {formData.tripDuration} days
            </label>
            <Slider
              value={formData.tripDuration}
              onChange={(_, value) => setFormData({ ...formData, tripDuration: value as number })}
              min={1}
              max={30}
              sx={{ color: '#2563eb' }}
            />
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>1 day</span>
              <span>30 days</span>
            </div>
          </div>

          {/* Climate Preference */}
          <div>
            <label className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
              <Thermometer className="w-5 h-5 text-blue-600" />
              Preferred Climate
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {climates.map(climate => (
                <button
                  key={climate}
                  type="button"
                  onClick={() => setFormData({ ...formData, climate })}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    formData.climate === climate
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {climate}
                </button>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
              <Heart className="w-5 h-5 text-blue-600" />
              Interests (Select all that apply)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {interestOptions.map(interest => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    formData.interests.includes(interest)
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Destination Hint */}
          <div>
            <label className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
              <MapPin className="w-5 h-5 text-blue-600" />
              Destination Ideas (Optional)
            </label>
            <textarea
              value={formData.destinationHint}
              onChange={(e) => setFormData({ ...formData, destinationHint: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="e.g., 'I love tropical beaches in Southeast Asia' or 'Looking for mountain adventures in Europe'"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSaving || !formData.travelStyle || !formData.budget || !formData.climate}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>
      </div>
    </div>
  );
}

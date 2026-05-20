import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { mockDestinations } from '../data/mockDestinations';
import { Sparkles, MapPin, Calendar, Users, DollarSign, Loader } from 'lucide-react';
import { Slider } from '@mui/material';

export function GenerateItineraryPage() {
  const { isAuthenticated } = useAuth();
  const { preferences } = usePreferences();
  const navigate = useNavigate();

  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState(preferences?.tripDuration || 7);
  const [travelers, setTravelers] = useState(2);
  const [budget, setBudget] = useState(preferences?.budget || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGeneratedPreview(null);

    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 3000));

    const preview = {
      destination,
      duration,
      travelers,
      budget,
      summary: `Your personalized ${duration}-day adventure to ${destination} has been crafted! This itinerary combines your preferences for ${preferences?.travelStyle?.toLowerCase() || 'adventure'} travel with handpicked experiences.`,
      highlights: [
        'Accommodation recommendations matched to your budget',
        'Daily activities aligned with your interests',
        'Estimated costs for transparent budgeting',
        'Local tips from AI-analyzed traveler reviews'
      ],
      estimatedCost: budget === 'Budget ($500-1500)' ? '$1,200' : budget === 'Moderate ($1500-3000)' ? '$2,400' : '$4,800'
    };

    setGeneratedPreview(preview);
    setIsGenerating(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-purple-100 rounded-full mb-4">
            <Sparkles className="w-10 h-10 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-3">Generate Your Itinerary</h1>
          <p className="text-lg text-gray-600">
            AI-powered personalization using your preferences and vector similarity search
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Trip Details</h2>

            <form onSubmit={handleGenerate} className="space-y-6">
              {/* Destination */}
              <div>
                <label className="flex items-center gap-2 text-gray-800 font-semibold mb-3">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Destination
                </label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a destination...</option>
                  {mockDestinations.map(dest => (
                    <option key={dest.id} value={dest.name}>
                      {dest.name}, {dest.country}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="flex items-center gap-2 text-gray-800 font-semibold mb-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Duration: {duration} days
                </label>
                <Slider
                  value={duration}
                  onChange={(_, value) => setDuration(value as number)}
                  min={1}
                  max={30}
                  sx={{ color: '#2563eb' }}
                />
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>1 day</span>
                  <span>30 days</span>
                </div>
              </div>

              {/* Travelers */}
              <div>
                <label className="flex items-center gap-2 text-gray-800 font-semibold mb-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  Travelers: {travelers}
                </label>
                <Slider
                  value={travelers}
                  onChange={(_, value) => setTravelers(value as number)}
                  min={1}
                  max={10}
                  sx={{ color: '#2563eb' }}
                />
              </div>

              {/* Budget */}
              <div>
                <label className="flex items-center gap-2 text-gray-800 font-semibold mb-3">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Budget
                </label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select budget...</option>
                  <option value="Budget ($500-1500)">Budget ($500-1500)</option>
                  <option value="Moderate ($1500-3000)">Moderate ($1500-3000)</option>
                  <option value="Luxury ($3000+)">Luxury ($3000+)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Generating with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Itinerary
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Preview/Loading */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {isGenerating && (
              <div className="text-center py-12">
                <div className="inline-block p-4 bg-purple-100 rounded-full mb-4 animate-pulse">
                  <Sparkles className="w-12 h-12 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">Creating Your Perfect Trip</h3>
                <div className="space-y-3 text-gray-600">
                  <p className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></span>
                    Analyzing your preferences...
                  </p>
                  <p className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    Running vector similarity search...
                  </p>
                  <p className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                    Generating personalized itinerary...
                  </p>
                </div>
              </div>
            )}

            {!isGenerating && !generatedPreview && (
              <div className="text-center py-12">
                <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                  <Sparkles className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Ready to Generate</h3>
                <p className="text-gray-600">
                  Fill out the form and click generate to create your personalized itinerary
                </p>
              </div>
            )}

            {generatedPreview && !isGenerating && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-6">
                  <h3 className="text-2xl font-bold mb-2">Success!</h3>
                  <p className="text-blue-50">{generatedPreview.summary}</p>
                </div>

                <div>
                  <h4 className="font-bold text-gray-800 mb-3">What's Included:</h4>
                  <ul className="space-y-2">
                    {generatedPreview.highlights.map((highlight: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-600">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mt-2"></span>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-medium mb-1">Estimated Total Cost</p>
                  <p className="text-3xl font-bold text-green-600">{generatedPreview.estimatedCost}</p>
                </div>

                <button
                  onClick={() => navigate('/itineraries')}
                  className="w-full py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-all"
                >
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

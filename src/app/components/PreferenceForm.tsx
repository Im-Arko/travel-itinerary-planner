import { useState } from 'react';
import { Slider } from '@mui/material';
import { MapPin, Calendar, DollarSign, Users, Heart } from 'lucide-react';

interface Preferences {
  destination: string;
  duration: number;
  budget: number;
  travelers: number;
  interests: string[];
}

interface PreferenceFormProps {
  onSubmit: (preferences: Preferences) => void;
}

const interestOptions = [
  'Adventure', 'Culture', 'Food', 'Nature', 'Beach',
  'History', 'Shopping', 'Nightlife', 'Photography', 'Relaxation'
];

export function PreferenceForm({ onSubmit }: PreferenceFormProps) {
  const [preferences, setPreferences] = useState<Preferences>({
    destination: '',
    duration: 7,
    budget: 3000,
    travelers: 2,
    interests: []
  });

  const toggleInterest = (interest: string) => {
    setPreferences(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(preferences);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-8 bg-white rounded-2xl shadow-lg">
      <h2 className="text-3xl font-bold mb-8 text-gray-900">Plan Your Perfect Trip</h2>

      <div className="space-y-8">
        {/* Destination */}
        <div>
          <label className="flex items-center gap-2 text-gray-700 font-medium mb-3">
            <MapPin className="w-5 h-5 text-blue-600" />
            Where would you like to go?
          </label>
          <input
            type="text"
            placeholder="e.g., Japan, Italy, Thailand..."
            value={preferences.destination}
            onChange={(e) => setPreferences({ ...preferences, destination: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Duration */}
        <div>
          <label className="flex items-center gap-2 text-gray-700 font-medium mb-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            Trip Duration: {preferences.duration} days
          </label>
          <Slider
            value={preferences.duration}
            onChange={(_, value) => setPreferences({ ...preferences, duration: value as number })}
            min={1}
            max={30}
            sx={{ color: '#2563eb' }}
          />
        </div>

        {/* Budget */}
        <div>
          <label className="flex items-center gap-2 text-gray-700 font-medium mb-3">
            <DollarSign className="w-5 h-5 text-blue-600" />
            Budget: ${preferences.budget.toLocaleString()}
          </label>
          <Slider
            value={preferences.budget}
            onChange={(_, value) => setPreferences({ ...preferences, budget: value as number })}
            min={500}
            max={10000}
            step={500}
            sx={{ color: '#2563eb' }}
          />
        </div>

        {/* Travelers */}
        <div>
          <label className="flex items-center gap-2 text-gray-700 font-medium mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            Number of Travelers: {preferences.travelers}
          </label>
          <Slider
            value={preferences.travelers}
            onChange={(_, value) => setPreferences({ ...preferences, travelers: value as number })}
            min={1}
            max={10}
            sx={{ color: '#2563eb' }}
          />
        </div>

        {/* Interests */}
        <div>
          <label className="flex items-center gap-2 text-gray-700 font-medium mb-3">
            <Heart className="w-5 h-5 text-blue-600" />
            What interests you?
          </label>
          <div className="flex flex-wrap gap-3">
            {interestOptions.map(interest => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`px-4 py-2 rounded-full font-medium transition-all ${
                  preferences.interests.includes(interest)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
        >
          Generate Personalized Itinerary
        </button>
      </div>
    </form>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences, UserPreferences } from '../context/PreferencesContext';
import { preferencesApi } from '../services/api';
import { errorMessage, normalizeBudget, normalizeClimate } from '../utils/formatters';
import { Slider } from '@mui/material';
import {
  Settings, Heart, DollarSign, Calendar, Thermometer,
  MapPin, Save, AlertCircle, Sparkles, CheckCircle, Wand2, Users, Globe,
} from 'lucide-react';

const interestEmojis: Record<string, string> = {
  Beach: '🏖️', Mountains: '🏔️', Cities: '🏙️', History: '🏛️',
  Food: '🍜', Art: '🎨', Shopping: '🛍️', Nightlife: '🌙',
  Wildlife: '🦁', Photography: '📸', Wellness: '🧘', 'Adventure Sports': '🥾',
};

const travelStyles  = ['solo', 'couple', 'family', 'adventure', 'cultural', 'relaxation', 'luxury', 'budget'];
const budgetRanges  = [
  { value: 'budget',   label: 'Low',   sub: 'Affordable adventures' },
  { value: 'moderate', label: 'Moderate', sub: 'Best of both worlds'   },
  { value: 'luxury',   label: 'Luxury',   sub: 'No compromises'        },
];
const climates      = ['any', 'tropical', 'temperate', 'arid', 'cold', 'mediterranean'];
const interestOptions = [
  'Beach', 'Mountains', 'Cities', 'History', 'Food', 'Art',
  'Shopping', 'Nightlife', 'Wildlife', 'Photography', 'Wellness', 'Adventure Sports',
];

/* ── Section wrapper ── */
function Section({ icon: Icon, title, hint, children }: {
  icon: React.ElementType;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#FAF0EE] flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#C0392B]" />
        </div>
        <span className="font-serif text-lg font-semibold text-[#2C2420]">{title}</span>
        {hint && <span className="text-sm text-[#9A8E84] font-sans">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function PreferencesPage() {
  const { isAuthenticated, loading } = useAuth();
  const { preferences, savePreferences } = usePreferences();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<UserPreferences>({
    travelStyle:     preferences?.travelStyle     || '',
    budget:          normalizeBudget(preferences?.budget),
    tripDuration:    preferences?.tripDuration    || 7,
    climate:         normalizeClimate(preferences?.climate),
    interests:       preferences?.interests       || [],
    destinationHint: preferences?.destinationHint || '',
  });

  const [isLoadingPrefs, setIsLoadingPrefs] = useState(false);
  const [saveSuccess,    setSaveSuccess]    = useState(false);
  const [error,          setError]          = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/login');
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    setIsLoadingPrefs(true);
    preferencesApi.get()
      .then(pref => {
        const mapped = {
          travelStyle:     pref.travel_style || '',
          budget:          normalizeBudget(pref.budget),
          tripDuration:    pref.trip_duration,
          climate:         normalizeClimate(pref.preferred_climate),
          interests:       pref.interests,
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

  const toggleInterest = (interest: string) =>
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setError('');
    try {
      const saved = await preferencesApi.save({
        budget:           normalizeBudget(formData.budget),
        preferred_climate: normalizeClimate(formData.climate),
        destination_type: 'any',
        trip_duration:    formData.tripDuration,
        travel_style:     formData.travelStyle,
        interests:        formData.interests,
        dietary_needs:    null,
        accessibility:    false,
      });
      const mapped = {
        travelStyle:     saved.travel_style,
        budget:          normalizeBudget(saved.budget),
        tripDuration:    saved.trip_duration,
        climate:         normalizeClimate(saved.preferred_climate),
        interests:       saved.interests,
        destinationHint: formData.destinationHint,
      };
      setFormData(mapped);
      savePreferences(mapped);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      setError(errorMessage(err, 'Unable to save preferences.'));
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4" style={{ background: '#FAF6F1' }}>
      <div className="max-w-3xl mx-auto">

        {/* ── Page header ── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-sans mb-5"
            style={{ background: '#FAF0EE', borderColor: '#F4C5C0', color: '#C0392B' }}>
            <Sparkles className="w-3.5 h-3.5" />
            Personalization
          </div>
          <h1 className="font-serif text-4xl font-bold mb-3" style={{ color: '#2C2420' }}>
            Your travel style
          </h1>
          <p className="font-sans text-base max-w-md mx-auto leading-relaxed" style={{ color: '#7A6E65' }}>
            Tell us how you like to travel. Our AI uses this to craft recommendations that actually feel like you.
          </p>
        </div>

        {/* ── Form card ── */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-8 space-y-10 border"
          style={{ background: '#FFFFFF', borderColor: '#E8DFD4', boxShadow: '0 6px 20px rgba(44,36,32,0.08)' }}
        >
          {/* Status banners */}
          {saveSuccess && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-sans"
              style={{ background: '#F2F7F2', borderColor: '#C1DCC4', color: '#4C6950' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: '#C1DCC4' }}>
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="font-medium">Preferences saved, your next trip will feel even more personal.</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-sans"
              style={{ background: '#FDF3F2', borderColor: '#F4C5C0', color: '#A12F24' }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoadingPrefs && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-sans"
              style={{ background: '#FAF6F1', borderColor: '#E8DFD4', color: '#7A6E65' }}>
              <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#C0392B', borderTopColor: 'transparent' }} />
              <span>Loading your saved preferences…</span>
            </div>
          )}

          {/* ── Travel style ── */}
          <Section icon={Users} title="Travel style">
            <div className="flex flex-wrap gap-2">
              {travelStyles.map(style => {
                const active = formData.travelStyle === style;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setFormData({ ...formData, travelStyle: style })}
                    className="px-5 py-2 rounded-full text-sm font-medium font-sans transition-all duration-200"
                    style={{
                      background:   active ? '#C0392B' : '#F5EDE3',
                      color:        active ? '#FFFFFF' : '#7A6E65',
                      borderWidth:  1,
                      borderStyle:  'solid',
                      borderColor:  active ? '#C0392B' : '#E8DFD4',
                      boxShadow:    active ? '0 2px 8px rgba(192,57,43,0.25)' : 'none',
                    }}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── Budget ── */}
          <Section icon={DollarSign} title="Budget range">
            <div className="grid grid-cols-3 gap-3">
              {budgetRanges.map(({ value, label, sub }) => {
                const active = formData.budget === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, budget: value })}
                    className="px-4 py-4 rounded-xl text-left transition-all duration-200 border"
                    style={{
                      background:  active ? '#C0392B' : '#FAF6F1',
                      color:       active ? '#FFFFFF' : '#2C2420',
                      borderColor: active ? '#C0392B' : '#E8DFD4',
                      boxShadow:   active ? '0 4px 12px rgba(192,57,43,0.25)' : 'none',
                    }}
                  >
                    <p className="font-semibold font-sans">{label}</p>
                    <p className="text-xs mt-0.5 font-sans"
                      style={{ color: active ? 'rgba(255,255,255,0.75)' : '#9A8E84' }}>
                      {sub}
                    </p>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── Trip duration ── */}
          <Section icon={Calendar} title="Trip duration">
            <div className="px-1">
              <div className="flex items-baseline justify-between mb-3">
                <span className="font-sans text-sm" style={{ color: '#7A6E65' }}>How long do you usually travel?</span>
                <span className="font-serif text-2xl font-bold" style={{ color: '#C0392B' }}>
                  {formData.tripDuration}
                  <span className="text-sm font-sans font-normal ml-1" style={{ color: '#9A8E84' }}>days</span>
                </span>
              </div>
              <Slider
                value={formData.tripDuration}
                onChange={(_, value) => setFormData({ ...formData, tripDuration: value as number })}
                min={1}
                max={30}
                sx={{
                  color: '#C0392B',
                  '& .MuiSlider-thumb': {
                    width: 20, height: 20,
                    boxShadow: '0 2px 8px rgba(192,57,43,0.30)',
                  },
                  '& .MuiSlider-track': { height: 4 },
                  '& .MuiSlider-rail':  { height: 4, background: '#E8DFD4' },
                }}
              />
              <div className="flex justify-between text-xs font-sans mt-1" style={{ color: '#B0A998' }}>
                <span>1 day</span>
                <span>30 days</span>
              </div>
            </div>
          </Section>

          {/* ── Climate ── */}
          <Section icon={Globe} title="Preferred climate">
            <div className="flex flex-wrap gap-2">
              {climates.map(climate => {
                const active = formData.climate === climate;
                return (
                  <button
                    key={climate}
                    type="button"
                    onClick={() => setFormData({ ...formData, climate })}
                    className="px-5 py-2 rounded-full text-sm font-medium font-sans transition-all duration-200 border"
                    style={{
                      background:  active ? '#C0392B' : '#FAF6F1',
                      color:       active ? '#FFFFFF' : '#7A6E65',
                      borderColor: active ? '#C0392B' : '#E8DFD4',
                      boxShadow:   active ? '0 2px 8px rgba(192,57,43,0.25)' : 'none',
                    }}
                  >
                    {climate.charAt(0).toUpperCase() + climate.slice(1)}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── Interests, dusty rose active (very Pinterest) ── */}
          <Section icon={Heart} title="Your interests" hint="(select all that apply)">
            <div className="flex flex-wrap gap-2">
              {interestOptions.map(interest => {
                const active = formData.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium font-sans transition-all duration-200 border"
                    style={{
                      background:  active ? '#C4737A' : '#FAF6F1',
                      color:       active ? '#FFFFFF' : '#7A6E65',
                      borderColor: active ? '#C4737A' : '#E8DFD4',
                      boxShadow:   active ? '0 2px 8px rgba(196,115,122,0.30)' : 'none',
                    }}
                  >
                    <span>{interestEmojis[interest] || ''}</span>
                    {interest}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── Destination hint ── */}
          <Section icon={MapPin} title="Destination ideas" hint="(optional)">
            <textarea
              value={formData.destinationHint}
              onChange={e => setFormData({ ...formData, destinationHint: e.target.value })}
              rows={3}
              placeholder="e.g. 'I love tropical beaches in Southeast Asia' or 'Looking for mountain adventures in Europe'…"
              className="w-full px-4 py-3 rounded-xl font-sans text-sm resize-none transition-all duration-150 border outline-none"
              style={{
                background:   '#FAF6F1',
                borderColor:  '#E8DFD4',
                color:        '#2C2420',
              }}
              onFocus={e  => { e.target.style.borderColor = '#C0392B'; e.target.style.boxShadow = '0 0 0 3px rgba(192,57,43,0.12)'; }}
              onBlur={e   => { e.target.style.borderColor = '#E8DFD4'; e.target.style.boxShadow = 'none'; }}
            />
          </Section>

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={!formData.travelStyle || !formData.budget || !formData.climate}
            className="w-full py-4 rounded-xl font-semibold font-sans flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            style={{
              background: '#C0392B',
              color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(192,57,43,0.30)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#A12F24')}
            onMouseLeave={e => (e.currentTarget.style.background = '#C0392B')}
          >
            <Save className="w-5 h-5" />
            Save preferences
            <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" />
          </button>
        </form>
      </div>
    </div>
  );
}
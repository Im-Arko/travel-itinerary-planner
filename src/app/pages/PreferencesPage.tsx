import { InterestIcon } from "../components/InterestIcon";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePreferences, UserPreferences, mapPreferences } from "../context/PreferencesContext";
import { preferencesApi } from "../services/api";
import {
  errorMessage,
  normalizeBudget,
  normalizeClimate,
} from "../utils/formatters";
import { Slider } from "@mui/material";
import { Save, AlertCircle, CheckCircle, ArrowRight } from "lucide-react";
import { TravelHero, travelPhotos } from "../components/TravelHero";
const travelStyles = [
  "solo",
  "couple",
  "family",
  "adventure",
  "cultural",
  "relaxation",
  "luxury",
  "budget",
];
const budgetRanges = [
  {
    value: "budget",
    label: "Keep it simple",
    sub: "More experiences, less spending",
  },
  {
    value: "moderate",
    label: "A little balance",
    sub: "Comfort with room to explore",
  },
  {
    value: "luxury",
    label: "Make it special",
    sub: "Space for the finer details",
  },
];
const climates = [
  "any",
  "tropical",
  "temperate",
  "arid",
  "cold",
  "mediterranean",
];
const interestOptions = [
  "Beach",
  "Mountains",
  "Cities",
  "History",
  "Food",
  "Art",
  "Shopping",
  "Nightlife",
  "Wildlife",
  "Photography",
  "Wellness",
  "Adventure Sports",
];
function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="form-section">
      <legend>
        <span>{number}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
export function PreferencesPage() {
  const { isAuthenticated, loading } = useAuth();
  const { preferences, savePreferences } = usePreferences();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<UserPreferences>({
    travelStyle: preferences?.travelStyle || "",
    budget: normalizeBudget(preferences?.budget),
    tripDuration: preferences?.tripDuration || 7,
    climate: normalizeClimate(preferences?.climate),
    interests: preferences?.interests || [],
    destinationHint: preferences?.destinationHint || "",
    tripNotes: preferences?.tripNotes || "",
    destinationType: preferences?.destinationType || "any",
    dietaryNeeds: preferences?.dietaryNeeds || "",
    accessibility: preferences?.accessibility || false,
  });

  const [isLoadingPrefs, setIsLoadingPrefs] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    setIsLoadingPrefs(true);
    preferencesApi
      .get()
      .then((pref) => {
        const mapped = mapPreferences(pref);
        setFormData(mapped);
        savePreferences(mapped);
      })
      .catch((err) => {
        const message = errorMessage(err, "");
        if (message && message !== "Preferences not found") setError(message);
      })
      .finally(() => setIsLoadingPrefs(false));
  }, [isAuthenticated, savePreferences]);

  const toggleInterest = (interest: string) =>
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setError("");
    try {
      const saved = await preferencesApi.save({
        budget: normalizeBudget(formData.budget),
        preferred_climate: normalizeClimate(formData.climate),
        destination_type: formData.destinationType,
        trip_duration: formData.tripDuration,
        travel_style: formData.travelStyle,
        interests: formData.interests,
        dietary_needs: formData.dietaryNeeds || null,
        accessibility: formData.accessibility,
        planning_details: {destinationHint:formData.destinationHint,tripNotes:formData.tripNotes},
      });
      const mapped = mapPreferences(saved);
      setFormData(mapped);
      savePreferences(mapped);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      setError(errorMessage(err, "Unable to save preferences."));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div>
      <TravelHero
        image={travelPhotos.hills}
        eyebrow="A few things about you"
        title="Your kind of getting away."
        script="Every traveller has a rhythm."
        description="Long walks or slow mornings. A city to get lost in, or a beach to do nothing on. Tell us what feels like you."
        caption="Make it your own"
      />
      <div className="travel-container travel-section grid lg:grid-cols-[1fr_320px] gap-9 items-start">
        <form onSubmit={handleSubmit} className="paper-panel paper-pad">
          <div className="flex justify-between gap-4 items-start mb-8">
            <div>
              <p className="travel-eyebrow text-[#869073] mb-2">
                Your travel profile
              </p>
              <h2 className="editorial-title">The way you wander</h2>
            </div>
            <span className="font-script text-2xl text-[#8b7354] -rotate-6 hidden sm:block">
              All about you.
            </span>
          </div>
          {saveSuccess && (
            <div role="status" className="travel-success mb-6">
              <CheckCircle size={18} className="shrink-0 mt-1" />
              Preferences saved. You're ready to plan your next trip.
            </div>
          )}
          {error && (
            <div role="alert" className="travel-error mb-6">
              <AlertCircle size={18} className="shrink-0 mt-1" />
              {error}
            </div>
          )}
          {isLoadingPrefs && (
            <p role="status" className="form-hint mb-6">
              Loading your saved preferences…
            </p>
          )}
          <fieldset
            disabled={isLoadingPrefs || isSaving}
            className="min-w-0 disabled:opacity-60"
          >
            <Section number="01" title="How do you like to travel?">
              <div className="flex flex-wrap gap-2">
                {travelStyles.map((style) => (
                  <button
                    key={style}
                    type="button"
                    className="travel-choice capitalize"
                    aria-pressed={formData.travelStyle === style}
                    onClick={() =>
                      setFormData({ ...formData, travelStyle: style })
                    }
                  >
                    {style}
                  </button>
                ))}
              </div>
            </Section>
            <Section number="02" title="A budget that feels comfortable">
              <div className="grid sm:grid-cols-3 gap-3">
                {budgetRanges.map(({ value, label, sub }) => (
                  <button
                    key={value}
                    type="button"
                    className="travel-choice block text-left p-4"
                    aria-pressed={formData.budget === value}
                    onClick={() => setFormData({ ...formData, budget: value })}
                  >
                    <span className="block font-bold mb-1">{label}</span>
                    <span className="text-xs opacity-80 leading-relaxed">
                      {sub}
                    </span>
                  </button>
                ))}
              </div>
            </Section>
            <Section number="03" title="How long would you stay?">
              <div className="flex justify-between items-baseline gap-4">
                <span className="form-hint">
                  A quick escape or a longer chapter?
                </span>
                <span className="font-script text-3xl text-[#4e6943] whitespace-nowrap">
                  {formData.tripDuration} days
                </span>
              </div>
              <Slider
                aria-label="Trip duration in days"
                value={formData.tripDuration}
                onChange={(_, value) =>
                  setFormData({ ...formData, tripDuration: value as number })
                }
                min={1}
                max={30}
                sx={{ color: "#53744c", marginTop: 1 }}
              />
              <div className="flex justify-between form-hint">
                <span>1 day</span>
                <span>30 days</span>
              </div>
            </Section>
            <Section number="04" title="Your forecast of choice">
              <div className="flex flex-wrap gap-2">
                {climates.map((climate) => (
                  <button
                    key={climate}
                    type="button"
                    className="travel-choice capitalize"
                    aria-pressed={formData.climate === climate}
                    onClick={() => setFormData({ ...formData, climate })}
                  >
                    {climate === "any" ? "Open to anything" : climate}
                  </button>
                ))}
              </div>
            </Section>
            <Section number="05" title="What draws you in?">
              <p className="form-hint mb-4">Pick as many as you like.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {interestOptions.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    className="travel-choice justify-start px-3"
                    aria-pressed={formData.interests.includes(interest)}
                    onClick={() => toggleInterest(interest)}
                  >
                    <InterestIcon interest={interest} />
                    <span className="text-left">{interest}</span>
                  </button>
                ))}
              </div>
            </Section>
            <div className="travel-field mb-8">
              <label htmlFor="destination-idea">
                Already daydreaming about somewhere?
              </label>
              <textarea
                id="destination-idea"
                value={formData.destinationHint}
                maxLength={150}
                onChange={(e) =>
                  setFormData({ ...formData, destinationHint: e.target.value })
                }
                rows={3}
                className="travel-input"
                placeholder="A city and country, such as Puducherry, India"
              />
              <p className="form-hint">
                Optional. Saved with your account; you'll confirm the intended place when planning.
              </p>
            </div>
            <div className="travel-field mb-7">
              <label htmlFor="trip-notes">Ideas for your trip</label>
              <textarea id="trip-notes" value={formData.tripNotes} maxLength={1000} className="travel-input" rows={3} placeholder="Quiet mornings, local food, galleries, or anything else that matters." onChange={event=>setFormData({...formData,tripNotes:event.target.value})}/>
            </div>
            <div className="travel-field mb-7">
              <label htmlFor="dietary-needs">Dietary needs and allergies</label>
              <input id="dietary-needs" value={formData.dietaryNeeds} maxLength={255} className="travel-input" onChange={event=>setFormData({...formData,dietaryNeeds:event.target.value})}/>
              <p className="form-hint">These needs stay in your plan. Restaurant kitchens and allergen safety still require direct confirmation.</p>
            </div>
            <label className="flex items-center gap-3 mb-8"><input type="checkbox" checked={formData.accessibility} onChange={event=>setFormData({...formData,accessibility:event.target.checked})}/>Step-free access is required</label>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="form-hint max-w-60">
                You can change these whenever your plans do.
              </p>
              <button
                type="submit"
                disabled={isSaving || !formData.travelStyle}
                className="travel-button"
              >
                <Save size={17} />
                {isSaving
                  ? "Saving…"
                  : saveSuccess
                    ? "Preferences saved"
                    : "Save my preferences"}
              </button>
            </div>
          </fieldset>
        </form>
        <aside className="lg:sticky lg:top-24">
          <figure className="postcard rotate-2 mx-2">
            <img
              src={travelPhotos.coast}
              alt="Waves reaching a quiet sandy beach"
              loading="lazy"
            />
            <figcaption>A little more your pace.</figcaption>
          </figure>
          <div className="journey-note mt-6">
            <p className="travel-eyebrow text-[#70805e] mb-3">
              A note for your next trip
            </p>
            <p>
              {formData.interests.length
                ? `You've made room for ${formData.interests.length} interests. We'll use them to help shape the places and days in your plan.`
                : "The best starting point is what you enjoy. Add a few interests and let them lead you somewhere new."}
            </p>
          </div>
          <Link to="/generate" className="travel-text-link mt-6">
            Ready to make a plan <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
    </div>
  );
}

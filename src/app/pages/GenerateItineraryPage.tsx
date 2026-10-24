import { InterestIcon } from "../components/InterestIcon";
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePreferences } from "../context/PreferencesContext";
import { itinerariesApi, ItineraryWithDays } from "../services/api";
import {
  errorMessage,
  normalizeBudget,
  normalizeClimate,
  normalizeDestinationType,
  titleCase,
} from "../utils/formatters";
import { Loader, AlertCircle, ArrowRight, Compass } from "lucide-react";
import { Slider } from "@mui/material";
import { TravelHero, travelPhotos } from "../components/TravelHero";
import { useDestinationPhoto } from "../components/useDestinationPhoto";
const budgets = ["budget", "moderate", "luxury"];
const climates = [
  "any",
  "tropical",
  "temperate",
  "arid",
  "cold",
  "mediterranean",
];
const destinationTypes = [
  "any",
  "beach",
  "mountain",
  "city",
  "countryside",
  "adventure",
  "cultural",
];
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
export function GenerateItineraryPage() {
  const { isAuthenticated, loading } = useAuth();
  const { preferences } = usePreferences();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [destinationHint, setDestinationHint] = useState(
    searchParams.get("destination") || preferences?.destinationHint || "",
  );
  const [duration, setDuration] = useState(preferences?.tripDuration || 7);
  const [budget, setBudget] = useState(normalizeBudget(preferences?.budget));
  const [climate, setClimate] = useState(
    normalizeClimate(preferences?.climate),
  );
  const [destinationType, setDestinationType] = useState("any");
  const [travelStyle, setTravelStyle] = useState(
    preferences?.travelStyle || "solo",
  );
  const [interests, setInterests] = useState<string[]>(
    preferences?.interests || [],
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedItinerary, setGeneratedItinerary] =
    useState<ItineraryWithDays | null>(null);
  const [error, setError] = useState("");
  const resultPanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (generatedItinerary) resultPanel.current?.focus();
  }, [generatedItinerary]);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, loading, navigate]);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest],
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGeneratedItinerary(null);
    setError("");

    try {
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
      setError(errorMessage(err, "Unable to generate itinerary."));
    } finally {
      setIsGenerating(false);
    }
  };

  const resultPhoto = useDestinationPhoto(generatedItinerary?.destination_id);
  if (loading) return null;
  return (
    <div>
      <TravelHero
        image={travelPhotos.road}
        eyebrow="The beginning of a good story"
        title="Let's take the scenic route."
        script="You bring the curiosity."
        description="Choose a place, set your pace, and leave room for the unexpected. We'll help you turn an idea into a day-by-day plan."
        caption="Where to next?"
      />
      <div className="travel-container travel-section grid lg:grid-cols-[1fr_340px] gap-9 items-start">
        <div className="paper-panel paper-pad">
          <div className="flex justify-between gap-4 items-center mb-8">
            <div>
              <p className="travel-eyebrow text-[#869073] mb-2">
                A plan in the making
              </p>
              <h2 className="editorial-title">Your next adventure</h2>
            </div>
            <Compass
              size={33}
              strokeWidth={1}
              className="text-[#8d9675] shrink-0"
            />
          </div>
          <form onSubmit={handleGenerate}>
            <fieldset
              disabled={isGenerating}
              className="min-w-0 disabled:opacity-60"
            >
              <div className="travel-field mb-7">
                <label htmlFor="trip-destination">
                  Where are you dreaming of?
                </label>
                <input
                  id="trip-destination"
                  value={destinationHint}
                  onChange={(e) => setDestinationHint(e.target.value)}
                  maxLength={500}
                  className="travel-input"
                  placeholder="A place, a feeling, or a little of both…"
                />
                <p className="form-hint">
                  Try “Kyoto” or “quiet mountain towns with great food”.
                </p>
              </div>
              <div className="border-y border-[#e0e2d5] py-5 mb-7">
                <div className="flex justify-between items-center gap-4">
                  <label id="duration-label" className="travel-label">
                    How long have you got?
                  </label>
                  <span className="font-script text-3xl text-[#597447]">
                    {duration} days
                  </span>
                </div>
                <Slider
                  aria-labelledby="duration-label"
                  value={duration}
                  onChange={(_, value) => setDuration(value as number)}
                  min={1}
                  max={30}
                  sx={{ color: "#53744c" }}
                />
                <div className="flex justify-between form-hint">
                  <span>A day away</span>
                  <span>A month of possibilities</span>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-5 gap-y-6 mb-7">
                <div className="travel-field">
                  <label htmlFor="trip-budget">Budget</label>
                  <select
                    id="trip-budget"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="travel-input"
                  >
                    {budgets.map((value) => (
                      <option key={value} value={value}>
                        {titleCase(value)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="travel-field">
                  <label htmlFor="trip-climate">Climate</label>
                  <select
                    id="trip-climate"
                    value={climate}
                    onChange={(e) => setClimate(e.target.value)}
                    className="travel-input"
                  >
                    {climates.map((value) => (
                      <option key={value} value={value}>
                        {value === "any" ? "Any climate" : titleCase(value)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="travel-field">
                  <label htmlFor="trip-type">The setting</label>
                  <select
                    id="trip-type"
                    value={destinationType}
                    onChange={(e) => setDestinationType(e.target.value)}
                    className="travel-input"
                  >
                    {destinationTypes.map((value) => (
                      <option key={value} value={value}>
                        {value === "any" ? "Surprise me" : titleCase(value)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="travel-field">
                  <label htmlFor="trip-style">Travel style</label>
                  <select
                    id="trip-style"
                    value={travelStyle}
                    onChange={(e) => setTravelStyle(e.target.value)}
                    className="travel-input"
                  >
                    {travelStyles.map((value) => (
                      <option key={value} value={value}>
                        {titleCase(value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <fieldset className="form-section">
                <legend>Make time for what you love</legend>
                <p className="form-hint mb-4">
                  Select the things you'd happily spend a day doing.
                </p>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      className="travel-choice px-3"
                      aria-pressed={interests.includes(interest)}
                      onClick={() => toggleInterest(interest)}
                    >
                      <InterestIcon interest={interest} />
                      {interest}
                    </button>
                  ))}
                </div>
              </fieldset>
              <button
                type="submit"
                disabled={isGenerating}
                className="travel-button w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Putting your trip together…
                  </>
                ) : (
                  <>
                    Make my travel plan
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </fieldset>
          </form>
        </div>
        <aside
          ref={resultPanel}
          tabIndex={-1}
          aria-label="Your travel plan"
          className="lg:sticky lg:top-24 space-y-6 scroll-mt-24 focus:outline-none"
          aria-live="polite"
          aria-atomic="true"
        >
          {error && (
            <div role="alert" className="travel-error">
              <AlertCircle size={18} className="shrink-0 mt-1" />
              <div>
                <p className="font-bold mb-1">A little detour</p>
                {error}
              </div>
            </div>
          )}
          {generatedItinerary && !isGenerating ? (
            <article className="photo-card">
              <div className="relative overflow-hidden">
                <img src={resultPhoto} alt="" className="photo-card-image" />
                <span className="photo-card-badge">Your plan is ready</span>
              </div>
              <div className="photo-card-body">
                <p className="travel-eyebrow text-[#7e8c6b] mb-3">
                  {generatedItinerary.destination_name}
                </p>
                <h2>{generatedItinerary.title}</h2>
                <p className="mt-3 line-clamp-4">
                  {generatedItinerary.summary}
                </p>
                <p className="mt-5 border-t border-[#dfe2d3] pt-4">
                  {generatedItinerary.duration_days} days ·{" "}
                  {titleCase(generatedItinerary.budget)} budget
                </p>
                <button
                  onClick={() =>
                    navigate(`/itineraries/${generatedItinerary.id}`)
                  }
                  className="travel-button w-full mt-5"
                >
                  Open my itinerary
                  <ArrowRight size={16} />
                </button>
              </div>
            </article>
          ) : (
            <>
              <figure className="postcard rotate-2 mx-2">
                <img
                  src={travelPhotos.lake}
                  alt="A wooden boat facing a mountain lake"
                  loading="lazy"
                />
                <figcaption>Oh, the places you'll go.</figcaption>
              </figure>
              <div className="journey-note">
                <p className="travel-eyebrow text-[#748563] mb-3">
                  {isGenerating
                    ? "A good trip takes a little thought"
                    : "Room for a little spontaneity"}
                </p>
                <p>
                  {isGenerating
                    ? "Finding a destination and putting together your days. Your plan will appear here when it’s ready."
                    : "Your itinerary is a starting point. Swap a busy afternoon for a long lunch. Take the detour. Make the trip yours."}
                </p>
                {isGenerating && (
                  <div
                    role="status"
                    className="flex gap-3 items-center text-sm text-[#4f6b43] mt-5"
                  >
                    <Loader size={17} className="animate-spin" />
                    Planning your {duration}-day escape…
                  </div>
                )}
              </div>
              <Link to="/preferences" className="travel-text-link">
                Fine-tune your travel style
                <ArrowRight size={16} />
              </Link>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

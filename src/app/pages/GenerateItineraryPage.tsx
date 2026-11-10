import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowRight, Loader, Plus, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePreferences, UserPreferences } from "../context/PreferencesContext";
import {
  planningApi,
  Place,
  PlanningJob,
  TripRequest,
  Capabilities,
} from "../services/planning";
import { itinerariesApi, ItineraryWithDays } from "../services/api";
import { errorMessage, titleCase, fallbackTravelImage } from "../utils/formatters";
import { TravelHero, travelPhotos } from "../components/TravelHero";
import { PlacePicker } from "../components/PlacePicker";
import { InterestIcon } from "../components/InterestIcon";
import LoadingState from "../components/LoadingState";

const interestsList = [
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
const phases: Record<string, string> = {
  queued: "Your plan is queued.",
  resolving: "Confirming the intended destination.",
  researching: "Finding nearby attractions and checking sources.",
  planning: "Arranging your days around your preferences.",
  saving: "Saving your travel plan.",
};
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export function GenerateItineraryPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const preferences = usePreferences();
  if (loading || preferences.loading)
    return <LoadingState fullPage message="Loading your travel preferences…" />;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return (
    <TripForm
      key={user.id}
      userId={user.id}
      preferences={preferences.preferences}
      preferenceError={preferences.error}
      reload={preferences.reload}
    />
  );
}

function TripForm({
  userId,
  preferences,
  preferenceError,
  reload,
}: {
  userId: number;
  preferences: UserPreferences | null;
  preferenceError: string;
  reload: () => void;
}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(
    searchParams.get("destination") || preferences?.destinationHint || "",
  );
  const [place, setPlace] = useState<Place | null>(null);
  const [stops, setStops] = useState<
    { query: string; place: Place | null; days: number }[]
  >([]);
  const [form, setForm] = useState<TripRequest>({
    budget: preferences?.budget || "moderate",
    preferred_climate: preferences?.climate || "any",
    destination_type: preferences?.destinationType || "any",
    trip_duration: preferences?.tripDuration || 7,
    travel_style: preferences?.travelStyle || "solo",
    interests: searchParams.get("interest")
      ? [searchParams.get("interest")!]
      : preferences?.interests || [],
    dietary_needs: preferences?.dietaryNeeds || "",
    accessibility: preferences?.accessibility || false,
    trip_notes: preferences?.tripNotes || "",
    start_date: "",
    origin: "",
    travelers: 1,
    children_ages: [],
    pace: "balanced",
    transport: "walking",
    currency: "USD",
    daily_budget: null,
    planner_mode: "ai",
  });
  const [ages, setAges] = useState("");
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [job, setJob] = useState<PlanningJob | null>(null);
  const [result, setResult] = useState<ItineraryWithDays | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const resultPanel = useRef<HTMLElement>(null);
  const active =
    starting || job?.status === "pending" || job?.status === "running";
  useEffect(() => {
    planningApi
      .capabilities()
      .then(setCapabilities)
      .catch(() =>
        setError(
          "Planning service details could not be loaded. Please refresh.",
        ),
      );
  }, []);
  useEffect(() => {
    const key = sessionStorage.getItem(`planning_job:${userId}`);
    if (!key) {
      planningApi
        .active()
        .then(setJob)
        .catch(() => undefined);
      return;
    }
    planningApi
      .job(key)
      .then(setJob)
      .catch(() => setRecoveryKey(key));
  }, [userId]);
  const jobKey = job?.request_key;
  const jobStatus = job?.status;
  useEffect(() => {
    if (!jobKey || !jobStatus || !["pending", "running"].includes(jobStatus))
      return;
    const controller = new AbortController();
    const timer = window.setInterval(() => {
      planningApi
        .job(jobKey, controller.signal)
        .then((next) => {
          setJob(next);
          setError("");
        })
        .catch((err) => {
          if (!controller.signal.aborted)
            setError(
              errorMessage(
                err,
                "Progress could not be refreshed. Your plan may still be running.",
              ),
            );
        });
    }, 2000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [jobKey, jobStatus]);
  useEffect(() => {
    if (!job || !["complete", "failed", "cancelled"].includes(job.status))
      return;
    sessionStorage.removeItem(`planning_job:${userId}`);
    if (job.status === "complete" && job.itinerary_id)
      itinerariesApi
        .get(job.itinerary_id)
        .then(setResult)
        .catch((err) =>
          setError(
            errorMessage(
              err,
              "Your plan was saved, but could not be opened. Check My Trips.",
            ),
          ),
        );
    if (job.status === "failed")
      setError(
        job.error ||
          "Planning could not be completed. You can adjust your trip and retry.",
      );
  }, [job, userId]);
  useEffect(() => {
    if (result) resultPanel.current?.focus();
  }, [result]);

  const update = <K extends keyof TripRequest>(
    key: K,
    value: TripRequest[K],
  ) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setRecoveryKey(null);
  };
  const start = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setResult(null);
    if (preferenceError) {
      setError(
        "Load your saved preferences before planning, or edit and save them in Your Preferences.",
      );
      return;
    }
    setStarting(true);
    const key = recoveryKey || crypto.randomUUID();
    try {
      let selected = place;
      if (query.trim() && !selected) {
        const matches = await planningApi.places(query.trim());
        if (matches.length !== 1) {
          setError(
            "Choose the intended city from the destination results, including its region and country.",
          );
          return;
        }
        selected = matches[0];
        setPlace(selected);
        setQuery(selected.label);
      }
      if (stops.some((stop) => !stop.place)) {
        setError("Confirm each additional destination before planning.");
        return;
      }
      const extraDays = stops.reduce((sum, stop) => sum + stop.days, 0);
      if (stops.length && (!selected || form.trip_duration - extraDays < 1)) {
        setError(
          "Give the first destination at least one day, and keep all stop days within the total trip length.",
        );
        return;
      }
      const children = ages.trim()
        ? ages.split(",").map((value) => Number(value.trim()))
        : [];
      const payload: TripRequest = {
        ...form,
        place_id: selected?.id,
        destination_hint: query.trim() || undefined,
        start_date: form.start_date || null,
        arrival_time: form.arrival_time || null,
        departure_time: form.departure_time || null,
        children_ages: children,
        stops:
          stops.length && selected
            ? [
                { place_id: selected.id, days: form.trip_duration - extraDays },
                ...stops.map((stop) => ({
                  place_id: stop.place!.id,
                  days: stop.days,
                })),
              ]
            : [],
      };
      sessionStorage.setItem(`planning_job:${userId}`, key);
      const next = await planningApi.start(key, payload);
      setJob(next);
      setRecoveryKey(null);
    } catch (err) {
      setError(errorMessage(err, "Planning could not be started."));
      setRecoveryKey(key);
    } finally {
      setStarting(false);
    }
  };
  const cancel = async () => {
    if (!job) return;
    try {
      setJob(await planningApi.cancel(job.request_key));
    } catch (err) {
      setError(errorMessage(err, "Cancellation could not be confirmed."));
    }
  };
  const checkRecovery = async () => {
    if (!recoveryKey) return;
    try {
      setJob(await planningApi.job(recoveryKey));
      setRecoveryKey(null);
      setError("");
    } catch (err) {
      setError(
        errorMessage(
          err,
          "That request could not be found. You can start a new plan.",
        ),
      );
    }
  };
  return (
    <div>
      <TravelHero
        image={travelPhotos.road}
        eyebrow="A little curiosity, a real place"
        title="Let's take the scenic route."
        script="You bring the curiosity."
        description="Confirm a destination, choose your dates and pace, and build a plan from sourced nearby attractions. Unknown prices and access details stay clearly marked."
        caption="Where to next?"
      />
      <div className="travel-container travel-section grid lg:grid-cols-[1fr_340px] gap-9 items-start">
        <form onSubmit={start} className="paper-panel paper-pad">
          <p className="travel-eyebrow text-[#71835d] mb-3">
            Your next adventure
          </p>
          <h2 className="editorial-title mb-6">Make room for a good trip.</h2>
          {preferenceError && (
            <div role="alert" className="travel-error mb-6">
              {preferenceError}
              <button
                type="button"
                className="travel-text-link"
                onClick={reload}
              >
                Reload saved preferences
              </button>
            </div>
          )}
          <fieldset
            disabled={Boolean(active)}
            className="min-w-0 space-y-7 disabled:opacity-65"
          >
            <PlacePicker
              label="Where do you want to go?"
              value={query}
              place={place}
              onChange={(value, chosen) => {
                setQuery(value);
                setPlace(chosen);
                setRecoveryKey(null);
              }}
            />
            <p className="form-hint">
              Leave the first destination blank for a catalog match. Your
              budget, climate and setting filters will be preserved.
            </p>
            {stops.map((stop, index) => (
              <div
                key={index}
                className="border border-[#d5dcc8] rounded-lg p-4 space-y-4"
              >
                <PlacePicker
                  label={`Next destination ${index + 2}`}
                  value={stop.query}
                  place={stop.place}
                  onChange={(value, chosen) =>
                    setStops((previous) =>
                      previous.map((item, i) =>
                        i === index
                          ? { ...item, query: value, place: chosen }
                          : item,
                      ),
                    )
                  }
                />
                <label className="travel-field">
                  Days here
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={stop.days}
                    className="travel-input"
                    onChange={(event) =>
                      setStops((previous) =>
                        previous.map((item, i) =>
                          i === index
                            ? { ...item, days: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="travel-text-link"
                  onClick={() =>
                    setStops((previous) =>
                      previous.filter((_, i) => i !== index),
                    )
                  }
                >
                  <X size={15} />
                  Remove stop
                </button>
              </div>
            ))}
            {stops.length < 5 && (
              <button
                type="button"
                className="travel-text-link"
                onClick={() =>
                  setStops((previous) => [
                    ...previous,
                    { query: "", place: null, days: 2 },
                  ])
                }
              >
                <Plus size={16} />
                Add another destination
              </button>
            )}
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Total trip length">
                <input
                  type="number"
                  min={1}
                  max={30}
                  required
                  value={form.trip_duration}
                  className="travel-input"
                  onChange={(event) =>
                    update("trip_duration", Number(event.target.value))
                  }
                />
                <span className="form-hint">
                  {stops.length
                    ? `${form.trip_duration - stops.reduce((sum, stop) => sum + stop.days, 0)} days at the first destination.`
                    : "1–30 days"}
                </span>
              </Field>
              <Field label="Start date">
                <input
                  type="date"
                  min={today()}
                  value={form.start_date || ""}
                  className="travel-input"
                  onChange={(event) => update("start_date", event.target.value)}
                />
              </Field>
              <Field label="Arrival time">
                <input
                  type="time"
                  value={form.arrival_time || ""}
                  className="travel-input"
                  onChange={(event) =>
                    update("arrival_time", event.target.value)
                  }
                />
              </Field>
              <Field label="Departure time">
                <input
                  type="time"
                  value={form.departure_time || ""}
                  className="travel-input"
                  onChange={(event) =>
                    update("departure_time", event.target.value)
                  }
                />
              </Field>
              <Field label="Travelers">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.travelers}
                  className="travel-input"
                  onChange={(event) =>
                    update("travelers", Number(event.target.value))
                  }
                />
              </Field>
              <Field label="Children's ages, separated by commas">
                <input
                  value={ages}
                  placeholder="For example: 6, 12"
                  className="travel-input"
                  onChange={(event) => setAges(event.target.value)}
                />
              </Field>
              <Field label="Starting city">
                <input
                  value={form.origin}
                  maxLength={150}
                  className="travel-input"
                  placeholder="Optional; transfers still need confirmation"
                  onChange={(event) => update("origin", event.target.value)}
                />
              </Field>
              <Select
                label="Pace"
                value={form.pace || "balanced"}
                values={["relaxed", "balanced", "active"]}
                onChange={(value) => update("pace", value)}
              />
              <Select
                label="Getting around"
                value={form.transport || "walking"}
                values={["walking", "cycling", "driving", "public_transit"]}
                onChange={(value) => update("transport", value)}
              />
              <Select
                label="Travel style"
                value={form.travel_style || "solo"}
                values={[
                  "solo",
                  "couple",
                  "family",
                  "group",
                  "adventure",
                  "cultural",
                  "relaxation",
                  "luxury",
                  "budget",
                ]}
                onChange={(value) => update("travel_style", value)}
              />
              <Select
                label="Budget style"
                value={form.budget || "moderate"}
                values={["budget", "moderate", "luxury"]}
                onChange={(value) => update("budget", value)}
              />
              <Select
                label="Currency"
                value={form.currency || "USD"}
                values={[
                  "USD",
                  "INR",
                  "EUR",
                  "GBP",
                  "JPY",
                  "AUD",
                  "CAD",
                  "CHF",
                  "SGD",
                ]}
                onChange={(value) => update("currency", value)}
              />
              <Field label="Your budget per person per day">
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  value={form.daily_budget ?? ""}
                  className="travel-input"
                  placeholder="Optional; a budget, not a quote"
                  onChange={(event) =>
                    update(
                      "daily_budget",
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                />
              </Field>
              <Select
                label="Climate for recommendations"
                value={form.preferred_climate || "any"}
                values={[
                  "any",
                  "tropical",
                  "temperate",
                  "arid",
                  "cold",
                  "mediterranean",
                ]}
                onChange={(value) => update("preferred_climate", value)}
              />
              <Select
                label="Setting for recommendations"
                value={form.destination_type || "any"}
                values={[
                  "any",
                  "beach",
                  "mountain",
                  "city",
                  "countryside",
                  "adventure",
                  "cultural",
                ]}
                onChange={(value) => update("destination_type", value)}
              />
            </div>
            <fieldset className="form-section">
              <legend>Make time for what you love</legend>
              <div className="flex flex-wrap gap-2">
                {interestsList.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    aria-pressed={form.interests?.includes(interest)}
                    className="travel-choice px-3"
                    onClick={() =>
                      update(
                        "interests",
                        form.interests?.includes(interest)
                          ? form.interests.filter((item) => item !== interest)
                          : [...(form.interests || []), interest],
                      )
                    }
                  >
                    <InterestIcon interest={interest} />
                    {interest}
                  </button>
                ))}
              </div>
            </fieldset>
            <Field label="Dietary needs and allergies">
              <input
                value={form.dietary_needs || ""}
                maxLength={255}
                className="travel-input"
                onChange={(event) =>
                  update("dietary_needs", event.target.value)
                }
              />
            </Field>
            <label className="flex gap-3 items-center">
              <input
                type="checkbox"
                checked={form.accessibility || false}
                onChange={(event) =>
                  update("accessibility", event.target.checked)
                }
              />
              Step-free access is required
            </label>
            <Field label="Ideas and notes for this trip">
              <textarea
                value={form.trip_notes}
                maxLength={1000}
                rows={3}
                className="travel-input"
                onChange={(event) => update("trip_notes", event.target.value)}
                placeholder="The feeling you want, activities you enjoy, or things to avoid."
              />
            </Field>
            <Field label="How should we plan?">
              <select
                className="travel-input"
                value={form.planner_mode}
                onChange={(event) =>
                  update("planner_mode", event.target.value as "ai" | "guided")
                }
              >
                <option value="ai" disabled={!capabilities?.ai_available}>
                  AI-assisted
                  {capabilities?.provider ? ` · ${capabilities.provider}` : ""}
                  {capabilities && !capabilities.ai_available
                    ? " · unavailable"
                    : ""}
                </option>
                <option value="guided">Sourced guided planner · no AI</option>
              </select>
              <p className="form-hint">
                Both modes use real place sources. Prices, opening hours,
                accessibility and bookings are never assumed.
              </p>
            </Field>
            <button
              type="submit"
              disabled={
                Boolean(active) ||
                !capabilities ||
                (form.planner_mode === "ai" && !capabilities.ai_available)
              }
              className="travel-button w-full"
            >
              {active ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Planning your trip…
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
        <aside
          ref={resultPanel}
          tabIndex={-1}
          aria-live="polite"
          className="lg:sticky lg:top-24 space-y-6 focus:outline-none"
        >
          {error && (
            <div role="alert" className="travel-error">
              <AlertCircle size={18} />
              <div>{error}</div>
            </div>
          )}
          {recoveryKey && (
            <div className="paper-panel p-5 space-y-3">
              <p>
                We could not confirm whether the request reached the server.
                Check its progress before starting again.
              </p>
              <button
                className="travel-button travel-button-outline"
                onClick={checkRecovery}
              >
                Check request
              </button>
              <button
                className="travel-text-link"
                onClick={() => {
                  setRecoveryKey(null);
                  sessionStorage.removeItem(`planning_job:${userId}`);
                }}
              >
                Use a new request
              </button>
            </div>
          )}
          {active && (
            <div role="status" className="paper-panel p-6 space-y-4">
              <Loader className="animate-spin" />
              <h2 className="editorial-title text-xl">
                Your plan is taking shape.
              </h2>
              <p>{phases[job?.phase || "queued"] || "Checking your plan."}</p>
              <p className="form-hint">
                You can leave this page and return to check progress. Failed and
                cancelled requests do not use your successful-plan allowance.
              </p>
              {job && (
                <button
                  type="button"
                  onClick={cancel}
                  className="travel-text-link"
                >
                  Cancel planning
                </button>
              )}
            </div>
          )}
          {result && (
            <article className="photo-card">
              {result.image_url ? (
                <img onError={fallbackTravelImage}
                  src={result.image_url}
                  alt="An attraction included in this plan"
                  className="photo-card-image"
                />
              ) : (
                <div className="p-8 bg-[#e8eddf] font-script text-3xl">
                  A new place to discover.
                </div>
              )}
              <div className="photo-card-body">
                <p className="travel-eyebrow">{result.destination_name}</p>
                <h2>{result.title}</h2>
                <p className="mt-3">{result.summary}</p>
                <button
                  onClick={() => navigate(`/itineraries/${result.id}`)}
                  className="travel-button w-full mt-5"
                >
                  Open my itinerary
                  <ArrowRight size={16} />
                </button>
              </div>
            </article>
          )}
          {!active && !result && (
            <div className="journey-note">
              <p className="font-script text-3xl mb-4">
                Real places. Room to wander.
              </p>
              <p>
                Sources and uncertainty travel with your plan. Check venue
                access, bookings and local conditions before departure.
              </p>
              <Link to="/preferences" className="travel-text-link mt-5">
                Your saved preferences
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="travel-field">
      <span className="travel-label">{label}</span>
      {children}
    </label>
  );
}
function Select({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        className="travel-input"
        onChange={(event) => onChange(event.target.value)}
      >
        {values.map((item) => (
          <option key={item} value={item}>
            {titleCase(item.replace(/_/g, " "))}
          </option>
        ))}
      </select>
    </Field>
  );
}

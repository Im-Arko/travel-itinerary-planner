import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Heart,
  Loader,
  MapPin,
  Save,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DayPlan, ItineraryWithDays, itinerariesApi } from "../services/api";
import { planningApi, PlanningJob } from "../services/planning";
import { errorMessage, titleCase } from "../utils/formatters";
import { TravelHero, PageMessage } from "../components/TravelHero";
import LoadingState from "../components/LoadingState";

const illustration = "/icons/plan-illustration.svg";
function safeUrl(value: string | undefined) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}
function SourceLink({
  url,
  children,
}: {
  url: string | undefined;
  children: React.ReactNode;
}) {
  const href = safeUrl(url);
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="travel-text-link"
    >
      {children}
    </a>
  ) : (
    <span>{children}</span>
  );
}
function amount(value: number, currency: string) {
  try {
    return value.toLocaleString(undefined, { style: "currency", currency });
  } catch {
    return `${value} ${currency}`;
  }
}

export function ItineraryDetailPage() {
  const { id } = useParams();
  const { user, isAuthenticated, loading } = useAuth();
  const [itinerary, setItinerary] = useState<ItineraryWithDays | null>(null);
  const [busy, setBusy] = useState("");
  const [opening, setOpening] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState("");
  const [title, setTitle] = useState("");
  const [dayJob, setDayJob] = useState<PlanningJob | null>(null);
  useEffect(() => {
    if (!isAuthenticated || !id) return;
    let cancelled = false;
    setOpening(true);
    itinerariesApi
      .get(Number(id))
      .then((data) => {
        if (cancelled) return;
        setItinerary(data);
        setNotes(data.user_notes || "");
        setRating(data.rating == null ? "" : String(data.rating));
        setTitle(data.title);
      })
      .catch((err) => {
        if (!cancelled)
          setError(errorMessage(err, "The itinerary could not be opened."));
      })
      .finally(() => {
        if (!cancelled) setOpening(false);
      });
    planningApi
      .active()
      .then((job) => {
        if (!cancelled && job?.itinerary_id === Number(id)) {
          setDayJob(job);
          setBusy("planning");
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated]);
  useEffect(() => {
    const key = dayJob?.request_key;
    if (!key || !["pending", "running"].includes(dayJob.status)) return;
    const controller = new AbortController();
    const timer = window.setInterval(() => {
      planningApi
        .job(key, controller.signal)
        .then((next) => {
          setDayJob(next);
          if (next.status === "complete" && next.itinerary_id) {
            itinerariesApi
              .get(next.itinerary_id)
              .then(setItinerary)
              .catch((err) =>
                setError(errorMessage(err, "Please refresh this plan.")),
              );
            setBusy("");
            if (user) sessionStorage.removeItem(`planning_job:${user.id}`);
          }
          if (next.status === "failed" || next.status === "cancelled") {
            setBusy("");
            if (next.error) setError(next.error);
          }
        })
        .catch((err) => {
          if (!controller.signal.aborted)
            setError(errorMessage(err, "Progress could not be checked."));
        });
    }, 2000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [dayJob?.request_key, dayJob?.status, user]);
  if (loading)
    return <LoadingState fullPage message="Opening your itinerary…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (opening)
    return <LoadingState fullPage message="Opening your itinerary…" />;
  if (!itinerary)
    return (
      <PageMessage title={error || "Itinerary not found."}>
        <Link to="/itineraries" className="travel-button">
          Back to my trips
        </Link>
      </PageMessage>
    );
  const plan = itinerary.plan || {};
  const sourced = plan.schema_version === 2;
  const saveMetadata = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("metadata");
    setError("");
    try {
      await itinerariesApi.update(itinerary.id, {
        title,
        user_notes: notes || null,
        rating: rating ? Number(rating) : null,
      });
      setItinerary(await itinerariesApi.get(itinerary.id));
    } catch (err) {
      setError(errorMessage(err, "Your changes could not be saved."));
    } finally {
      setBusy("");
    }
  };
  const favorite = async () => {
    if (busy) return;
    setBusy("favorite");
    try {
      await itinerariesApi.update(itinerary.id, {
        is_favorite: !itinerary.is_favorite,
      });
      setItinerary(await itinerariesApi.get(itinerary.id));
    } catch (err) {
      setError(errorMessage(err, "Favorite could not be changed."));
    } finally {
      setBusy("");
    }
  };
  const saveDay = async (
    number: number,
    values: {
      morning: string;
      afternoon: string;
      evening: string;
      user_note: string;
    },
  ) => {
    setBusy(`day:${number}`);
    setError("");
    try {
      setItinerary(await itinerariesApi.editDay(itinerary.id, number, values));
    } catch (err) {
      setError(errorMessage(err, "Day changes could not be saved."));
      throw err;
    } finally {
      setBusy("");
    }
  };
  const move = async (number: number, direction: number) => {
    const order = itinerary.days.map((day) => day.day_number);
    const index = order.indexOf(number);
    [order[index], order[index + direction]] = [
      order[index + direction],
      order[index],
    ];
    setBusy("reordering");
    try {
      setItinerary(await itinerariesApi.reorder(itinerary.id, order));
    } catch (err) {
      setError(errorMessage(err, "Days could not be reordered."));
    } finally {
      setBusy("");
    }
  };
  const regenerate = async (number: number) => {
    setBusy(`regenerate:${number}`);
    setError("");
    const key = crypto.randomUUID();
    try {
      const job = await itinerariesApi.regenerateDay(itinerary.id, number, key);
      setDayJob(job);
      if (user) sessionStorage.setItem(`planning_job:${user.id}`, key);
    } catch (err) {
      setError(errorMessage(err, "A new day could not be started."));
      setBusy("");
    }
  };
  return (
    <div>
      <TravelHero
        image={itinerary.image_url || illustration}
        eyebrow={itinerary.destination_name}
        title={itinerary.title}
        back={{ to: "/itineraries", label: "Your travel journal" }}
      >
        <div className="flex flex-wrap items-center gap-5">
          <span>
            {itinerary.duration_days} days · {titleCase(itinerary.budget)}
          </span>
          <span>
            {sourced
              ? plan.generation?.mode === "ai"
                ? `AI-assisted · ${plan.generation.provider}`
                : "Sourced guided planner"
              : "Legacy plan · details not source-checked"}
          </span>
          <button
            disabled={Boolean(busy)}
            onClick={favorite}
            aria-pressed={itinerary.is_favorite}
            className="inline-flex gap-2 items-center border border-white/50 rounded px-3 py-2"
          >
            <Heart
              size={16}
              className={itinerary.is_favorite ? "fill-white" : ""}
            />
            {itinerary.is_favorite ? "A favourite" : "Keep as a favourite"}
          </button>
        </div>
      </TravelHero>
      <div className="travel-container pb-20">
        {error && (
          <div role="alert" className="travel-error mt-6">
            {error}
          </div>
        )}
        {dayJob && ["pending", "running"].includes(dayJob.status) && (
          <div
            role="status"
            className="paper-panel p-5 mt-6 flex flex-wrap gap-4 items-center"
          >
            <Loader size={18} className="animate-spin" />
            Replanning one day: {dayJob.phase}
            <button
              className="travel-text-link"
              onClick={() =>
                planningApi
                  .cancel(dayJob.request_key)
                  .then((next) => {
                    setDayJob(next);
                    setBusy("");
                    if (user)
                      sessionStorage.removeItem(`planning_job:${user.id}`);
                  })
                  .catch((err) =>
                    setError(
                      errorMessage(err, "Cancellation could not be confirmed."),
                    ),
                  )
              }
            >
              Cancel
            </button>
          </div>
        )}
        <div className="pt-7 flex flex-wrap gap-6 text-sm text-[#69755d]">
          <span>
            Saved{" "}
            {new Date(
              itinerary.generated_at.endsWith("Z") ||
              /[+-]\d\d:\d\d$/.test(itinerary.generated_at)
                ? itinerary.generated_at
                : itinerary.generated_at + "Z",
            ).toLocaleDateString()}
          </span>
          {plan.image_source_url ? (
            <SourceLink url={plan.image_source_url}>
              {plan.image_credit ? `Photo: ${plan.image_credit.artist} · ${plan.image_credit.license}` : 'Photo source and credits'}
            </SourceLink>
          ) : (
            <span>Travel illustration; destination photo unavailable</span>
          )}
        </div>
        <div className="grid lg:grid-cols-[1fr_300px] gap-9 pt-9 items-start">
          <div className="min-w-0 space-y-7">
            {itinerary.summary && (
              <p className="text-lg leading-8 text-[#5e6b52]">
                {itinerary.summary}
              </p>
            )}
            {!!plan.warnings?.length && (
              <div className="journey-note">
                <h2 className="font-bold mb-3">Before you set out</h2>
                <ul className="list-disc pl-5 space-y-2 text-sm leading-7">
                  {plan.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {itinerary.days.map((day) => (
              <DayCard
                key={`${day.day_number}:${itinerary.updated_at}`}
                day={day}
                busy={Boolean(busy)}
                canUp={day.day_number > 1 && (plan.places?.length || 0) < 2}
                canDown={
                  day.day_number < itinerary.duration_days &&
                  (plan.places?.length || 0) < 2
                }
                canRegenerate={sourced}
                move={move}
                regenerate={regenerate}
                save={saveDay}
              />
            ))}
            <section className="paper-panel paper-pad">
              <h2 className="editorial-title mb-5">Make it yours</h2>
              <form onSubmit={saveMetadata} className="space-y-5">
                <label className="travel-field">
                  Trip title
                  <input
                    className="travel-input"
                    required
                    minLength={1}
                    maxLength={255}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
                <label className="travel-field">
                  Your notes
                  <textarea
                    className="travel-input"
                    rows={5}
                    maxLength={10000}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </label>
                <label className="travel-field">
                  Your rating
                  <select
                    className="travel-input"
                    value={rating}
                    onChange={(event) => setRating(event.target.value)}
                  >
                    <option value="">No rating</option>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option value={value} key={value}>
                        {value} / 5
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  disabled={Boolean(busy)}
                  type="submit"
                  className="travel-button"
                >
                  <Save size={16} />
                  Save title, notes and rating
                </button>
              </form>
            </section>
          </div>
          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="paper-panel p-6">
              <h2 className="font-bold mb-4">Your days, at a glance</h2>
              <nav
                aria-label="Itinerary days"
                className="max-h-64 overflow-y-auto space-y-3"
              >
                {itinerary.days.map((day) => (
                  <a
                    className="block text-sm text-[#597149]"
                    key={day.day_number}
                    href={`#day-${day.day_number}`}
                  >
                    Day {day.day_number}: {day.theme}
                  </a>
                ))}
              </nav>
            </div>
            <div className="paper-panel p-6">
              <h2 className="font-bold mb-3">Budget and costs</h2>
              {plan.costs ? (
                <>
                  <p className="text-sm leading-7">
                    Currency: {plan.costs.currency}. Your budget is per person,
                    per day.
                  </p>
                  <p className="mt-3">
                    Daily budget:{" "}
                    {plan.costs.daily_budget == null
                      ? "Not set"
                      : amount(plan.costs.daily_budget, plan.costs.currency)}
                  </p>
                  <p>
                    Total group budget:{" "}
                    {plan.costs.your_total_budget == null
                      ? "Not set"
                      : amount(
                          plan.costs.your_total_budget,
                          plan.costs.currency,
                        )}
                  </p>
                  <p className="form-hint mt-4">
                    Actual trip cost: not quoted. {plan.costs.exclusions}
                  </p>
                </>
              ) : (
                <p className="form-hint">
                  Legacy estimates have no recorded currency or quote source.
                  Treat them as unverified.
                </p>
              )}
            </div>
            {!!plan.packing_tips?.length && (
              <div className="journey-note">
                <h2 className="font-bold mb-3">Packing and preparation</h2>
                <ul className="list-disc pl-5 text-sm leading-7 space-y-2">
                  {plan.packing_tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
            {plan.best_time_to_go && (
              <div className="paper-panel p-6">
                <h2 className="font-bold mb-3">When to go</h2>
                <p className="text-sm leading-7">{plan.best_time_to_go}</p>
              </div>
            )}
            {plan.weather?.map((weather, index) => (
              <div key={index} className="paper-panel p-6">
                <h2 className="font-bold mb-3">
                  Weather · {plan.places?.[index]?.name}
                </h2>
                {weather.status === "forecast" && weather.data ? (
                  <ul className="text-sm leading-7">
                    {weather.data.daily.time.map((date, i) => (
                      <li key={date}>
                        {date}: {weather.data!.daily.temperature_2m_min[i]}–
                        {weather.data!.daily.temperature_2m_max[i]} °C · rain{" "}
                        {weather.data!.daily.precipitation_probability_max[i]}%
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="form-hint">{weather.reason}</p>
                )}
                <SourceLink url={weather.source_url}>
                  Forecast source
                </SourceLink>
              </div>
            ))}
            <Link to="/generate" className="travel-text-link">
              Dream up another trip
            </Link>
          </aside>
        </div>
        {!!plan.current_research?.length && (
          <section className="paper-panel paper-pad mt-9">
            <h2 className="editorial-title mb-5">Current web research</h2>
            <p className="form-hint mb-5">
              AI summaries can contain mistakes. Check the linked sources; a
              citation is not a booking or a guarantee of access.
            </p>
            {plan.current_research.map((research, index) => (
              <div key={index} className="mb-7">
                <h3 className="font-bold mb-3">{research.place}</h3>
                <p className="whitespace-pre-wrap text-sm leading-7">
                  {research.passages?.length
                    ? research.passages.map((passage, i) => (
                        <span key={i}>
                          {passage.text}
                          {passage.sources.map((source, j) => (
                            <sup key={j} className="ml-1">
                              <SourceLink url={source.url}>
                                [
                                {research.sources.findIndex(
                                  (item) => item.url === source.url,
                                ) + 1}
                                ]
                              </SourceLink>
                            </sup>
                          ))}
                        </span>
                      ))
                    : research.text}
                </p>
                {research.search_suggestions_html && (
                  <iframe
                    title={`Google Search suggestions for ${research.place}`}
                    srcDoc={research.search_suggestions_html}
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                    className="w-full border-0 mt-4"
                    height={200}
                  />
                )}
                <div className="flex flex-wrap gap-4 mt-4">
                  {research.sources.map((source) => (
                    <SourceLink key={source.url} url={source.url}>
                      {source.title}
                    </SourceLink>
                  ))}
                </div>
                {research.checked_at && (
                  <p className="form-hint mt-3">
                    Retrieved {new Date(research.checked_at).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}
        {!!plan.attribution?.length && (
          <footer className="pt-8 flex flex-wrap gap-5 text-xs text-[#77816c]">
            {plan.attribution.map((source) => (
              <SourceLink key={source.url} url={source.url}>
                {source.name}
              </SourceLink>
            ))}
          </footer>
        )}
      </div>
    </div>
  );
}

function DayCard({
  day,
  busy,
  canUp,
  canDown,
  canRegenerate,
  move,
  regenerate,
  save,
}: {
  day: DayPlan;
  busy: boolean;
  canUp: boolean;
  canDown: boolean;
  canRegenerate: boolean;
  move: (day: number, direction: number) => Promise<void>;
  regenerate: (day: number) => Promise<void>;
  save: (
    day: number,
    values: {
      morning: string;
      afternoon: string;
      evening: string;
      user_note: string;
    },
  ) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    morning: day.morning,
    afternoon: day.afternoon,
    evening: day.evening,
    user_note: day.user_note || "",
  });
  return (
    <article
      id={`day-${day.day_number}`}
      className="itinerary-day paper-panel paper-pad scroll-mt-24"
    >
      <header className="border-b border-[#d7ddc9] pb-5 mb-5">
        <p className="travel-eyebrow">
          Day {day.day_number}
          {day.date ? ` · ${day.date}` : ""}
        </p>
        <h2 className="editorial-title text-xl mt-2">{day.theme}</h2>
        <div className="flex flex-wrap gap-4 mt-4">
          <button
            className="travel-text-link"
            disabled={busy}
            onClick={() => {
              setDraft({morning:day.morning,afternoon:day.afternoon,evening:day.evening,user_note:day.user_note||''});
              setEditing((value) => !value);
            }}
          >
            {editing ? "Close editor" : "Edit day"}
          </button>
          {canUp && (
            <button
              disabled={busy}
              className="travel-text-link"
              aria-label={`Move day ${day.day_number} earlier`}
              onClick={() => move(day.day_number, -1)}
            >
              <ArrowUp size={15} />
              Earlier
            </button>
          )}
          {canDown && (
            <button
              disabled={busy}
              className="travel-text-link"
              aria-label={`Move day ${day.day_number} later`}
              onClick={() => move(day.day_number, 1)}
            >
              <ArrowDown size={15} />
              Later
            </button>
          )}
          {canRegenerate && (
            <button
              disabled={busy}
              className="travel-text-link"
              onClick={() => regenerate(day.day_number)}
            >
              <RefreshCw size={15} />
              Replan this day
            </button>
          )}
        </div>
      </header>
      {editing ? (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            save(day.day_number, draft)
              .then(() => setEditing(false))
              .catch(() => undefined);
          }}
        >
          {(["morning", "afternoon", "evening", "user_note"] as const).map(
            (slot) => (
              <label key={slot} className="travel-field">
                {slot === "user_note" ? "Your day notes" : `Your ${slot} plan`}
                <textarea
                  rows={3}
                  required={slot !== "user_note"}
                  maxLength={3000}
                  className="travel-input"
                  value={draft[slot]}
                  onChange={(event) =>
                    setDraft({ ...draft, [slot]: event.target.value })
                  }
                />
              </label>
            ),
          )}
          <p className="form-hint">
            Your edits are personal notes, not source-verified changes. Recheck
            routes and opening hours after editing or reordering.
          </p>
          <button disabled={busy} className="travel-button" type="submit">
            Save day
          </button>
        </form>
      ) : (
        <>
          {(["morning", "afternoon", "evening"] as const).map((slot) => (
            <section className="day-activity" key={slot}>
              <h3 className="capitalize">{slot}</h3>
              <p>{day[slot]}</p>
              {day.user_edited_slots?.includes(slot) && (
                <p className="form-hint mt-2">
                  Your edit. Source references and travel estimates below
                  describe the original activity.
                </p>
              )}
            </section>
          ))}
          {day.user_note && (
            <p className="journey-note whitespace-pre-wrap">{day.user_note}</p>
          )}
        </>
      )}
      {!!day.activities?.length && (
        <div className="border-t border-[#d7ddc9] mt-6 pt-5 space-y-5">
          <h3 className="font-bold">Referenced attractions and sources</h3>
          {day.activities.map((activity) => (
            <div key={activity.attraction_id} className="text-sm leading-7">
              <h4 className="font-bold">{activity.name}</h4>
              <p>
                Opening hours: {activity.opening_hours || "not confirmed"} ·
                Step-free access: {activity.accessibility}
              </p>
              <div className="flex flex-wrap gap-5">
                <SourceLink url={activity.source_url}>
                  Read the source
                </SourceLink>
                <SourceLink url={activity.map_url}>
                  <MapPin size={14} />
                  View on map
                </SourceLink>
              </div>
            </div>
          ))}
        </div>
      )}
      {!!day.travel_legs?.length && (
        <div className="mt-6 text-sm leading-7">
          <h3 className="font-bold">Travel estimates</h3>
          {day.travel_legs.map((leg, index) => (
            <p key={index}>
              To {leg.to}: about {leg.estimated_minutes} min · {leg.distance_km}{" "}
              km straight-line distance. Route and timetable unverified.
            </p>
          ))}
        </div>
      )}
      {day.estimated_cost != null && (
        <p className="form-hint mt-5">
          Legacy daily estimate: {day.estimated_cost.toLocaleString()} ·
          currency not recorded
        </p>
      )}
      {day.tips && <p className="journey-note mt-5">{day.tips}</p>}
    </article>
  );
}

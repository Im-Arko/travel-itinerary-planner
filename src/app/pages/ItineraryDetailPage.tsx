import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ItineraryWithDays, itinerariesApi } from "../services/api";
import { errorMessage, titleCase } from "../utils/formatters";
import {
  Heart,
  Star,
  Calendar,
  Home,
  Lightbulb,
  Sunrise,
  Sun,
  Moon,
  ArrowRight,
} from "lucide-react";
import { TravelHero, PageMessage } from "../components/TravelHero";
import { useDestinationPhoto } from "../components/useDestinationPhoto";
import LoadingState from "../components/LoadingState";
export function ItineraryDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState<ItineraryWithDays | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;

    setIsLoading(true);
    setError("");
    itinerariesApi
      .get(Number(id))
      .then(setItinerary)
      .catch((err) => setError(errorMessage(err, "Itinerary not found.")))
      .finally(() => setIsLoading(false));
  }, [id, isAuthenticated]);

  const toggleFavorite = async () => {
    if (!itinerary) return;
    const next = !itinerary.is_favorite;
    setItinerary({ ...itinerary, is_favorite: next });
    try {
      await itinerariesApi.update(itinerary.id, { is_favorite: next });
    } catch (err) {
      setItinerary({ ...itinerary, is_favorite: !next });
      setError(errorMessage(err, "Unable to update favorite status."));
    }
  };

  const photo = useDestinationPhoto(itinerary?.destination_id);
  if (loading || isLoading)
    return <LoadingState fullPage message="Opening your itinerary…" />;
  if (!itinerary)
    return (
      <PageMessage title={error || "This itinerary could not be found."}>
        <Link to="/itineraries" className="travel-button travel-button-outline">
          Back to my trips
          <ArrowRight size={16} />
        </Link>
      </PageMessage>
    );
  return (
    <div>
      <TravelHero
        image={photo}
        eyebrow={itinerary.destination_name}
        title={itinerary.title}
        back={{ to: "/itineraries", label: "Your travel journal" }}
      >
        <div className="flex flex-wrap items-center gap-5">
          <span className="text-sm flex items-center gap-2">
            <Calendar size={16} />
            {itinerary.duration_days} days away
          </span>
          <span className="text-sm capitalize">
            {itinerary.travel_style || "Your own"} style
          </span>
          <button
            onClick={toggleFavorite}
            className="inline-flex items-center gap-2 text-sm py-2 px-3 border border-white/50 rounded-sm hover:bg-white/15"
            aria-pressed={itinerary.is_favorite}
          >
            <Heart
              size={16}
              className={
                itinerary.is_favorite ? "fill-[#f5d1bd] text-[#f5d1bd]" : ""
              }
            />
            {itinerary.is_favorite ? "A favourite" : "Keep as a favourite"}
          </button>
        </div>
      </TravelHero>
      <div className="travel-container pb-20">
        <dl className="travel-stats">
          <div>
            <dt>The destination</dt>
            <dd>{itinerary.destination_name}</dd>
          </div>
          <div>
            <dt>Your pace</dt>
            <dd>{itinerary.duration_days} days</dd>
          </div>
          <div>
            <dt>Budget</dt>
            <dd>{titleCase(itinerary.budget)}</dd>
          </div>
          <div>
            <dt>Added to your journal</dt>
            <dd>
              {new Date(itinerary.generated_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>
        {error && (
          <div role="alert" className="travel-error mt-6">
            {error}
          </div>
        )}
        <div className="grid lg:grid-cols-[1fr_280px] gap-10 pt-10 items-start">
          <div className="min-w-0">
            {itinerary.summary && (
              <div className="mb-10">
                <p className="travel-eyebrow text-[#7f8d6a] mb-4">
                  The story of your trip
                </p>
                <p className="text-base sm:text-lg leading-[1.95] text-[#606d55]">
                  {itinerary.summary}
                </p>
              </div>
            )}
            <nav className="day-nav mb-7 lg:hidden" aria-label="Jump to a day">
              {itinerary.days.map((day) => (
                <a key={day.day_number} href={`#day-${day.day_number}`}>
                  Day {day.day_number}
                </a>
              ))}
            </nav>
            <div className="space-y-7">
              {itinerary.days.map((day) => (
                <article
                  id={`day-${day.day_number}`}
                  key={day.day_number}
                  className="itinerary-day paper-panel paper-pad"
                >
                  <header className="flex gap-5 border-b border-[#d7ddc9] pb-6">
                    <div className="shrink-0 border-r border-[#d7ddc9] pr-5 text-center">
                      <p className="travel-eyebrow text-[#8a936f]">Day</p>
                      <span className="font-display text-3xl text-[#526d42]">
                        {String(day.day_number).padStart(2, "0")}
                      </span>
                    </div>
                    <h2 className="editorial-title text-xl self-center">
                      {day.theme}
                    </h2>
                  </header>
                  <ActivityBlock
                    icon={Sunrise}
                    title="Morning"
                    value={day.morning}
                  />
                  <ActivityBlock
                    icon={Sun}
                    title="Afternoon"
                    value={day.afternoon}
                  />
                  <ActivityBlock
                    icon={Moon}
                    title="Evening"
                    value={day.evening}
                  />
                  {day.accommodation && (
                    <div className="flex gap-3 items-start bg-[#f0f2e8] p-4 mt-6 text-sm text-[#5c6e50]">
                      <Home size={17} className="shrink-0 mt-1" />
                      <div>
                        <h3 className="font-bold text-sm mb-1">
                          Stay the night
                        </h3>
                        <p className="leading-7">{day.accommodation}</p>
                      </div>
                    </div>
                  )}
                  {day.tips && (
                    <div className="flex gap-3 items-start mt-6 text-sm text-[#7d6c4e]">
                      <Lightbulb size={17} className="shrink-0 mt-1" />
                      <div>
                        <h3 className="font-bold text-sm mb-1">
                          A little local wisdom
                        </h3>
                        <p className="leading-7">{day.tips}</p>
                      </div>
                    </div>
                  )}
                  {day.estimated_cost != null && (
                    <p className="form-hint mt-6 border-t border-dashed border-[#cfd6c1] pt-4">
                      Estimated daily cost:{" "}
                      {day.estimated_cost.toLocaleString()}
                    </p>
                  )}
                </article>
              ))}
            </div>
            {itinerary.user_notes && (
              <section className="paper-panel paper-pad mt-8">
                <p className="travel-eyebrow text-[#8b7957] mb-3">
                  In your own words
                </p>
                <h2 className="font-script text-3xl text-[#62794e] mb-5">
                  Notes for the road
                </h2>
                <p className="text-sm leading-8 whitespace-pre-wrap text-[#616d55]">
                  {itinerary.user_notes}
                </p>
              </section>
            )}
          </div>
          <aside className="lg:sticky lg:top-24">
            <div className="paper-panel p-6">
              <p className="travel-eyebrow text-[#7c8b68] mb-4">
                Your days, at a glance
              </p>
              <nav
                aria-label="Itinerary days"
                className="space-y-1 max-h-[45vh] overflow-y-auto"
              >
                {itinerary.days.map((day) => (
                  <a
                    key={day.day_number}
                    href={`#day-${day.day_number}`}
                    className="flex gap-3 text-xs leading-6 py-2 border-b border-[#e1e4d6] text-[#67765b] hover:text-[#263f2b]"
                  >
                    <span className="font-stencil text-[#8d9577]">
                      {String(day.day_number).padStart(2, "0")}
                    </span>
                    <span>{day.theme}</span>
                  </a>
                ))}
              </nav>
            </div>
            <div className="journey-note">
              <p className="font-script text-3xl text-[#7b805c] mb-4">
                Leave room to get lost.
              </p>
              <p>
                This plan is a starting point. Check current opening hours,
                prices, and local conditions before you go.
              </p>
            </div>
            {itinerary.rating != null && (
              <p className="flex gap-2 items-center text-sm text-[#8b7957] mt-6">
                <Star size={16} className="fill-[#c9aa69] text-[#c9aa69]" />
                Your rating: {itinerary.rating} / 5
              </p>
            )}
            <Link to="/generate" className="travel-text-link mt-6">
              Dream up another trip
              <ArrowRight size={16} />
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
function ActivityBlock({
  icon: Icon,
  title,
  value,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
}) {
  return (
    <section className="day-activity">
      <h3>
        <Icon size={16} />
        {title}
      </h3>
      <p>{value}</p>
    </section>
  );
}

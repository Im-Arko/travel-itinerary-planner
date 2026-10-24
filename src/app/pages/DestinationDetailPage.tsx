import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Destination, destinationsApi } from "../services/api";
import {
  destinationImage,
  errorMessage,
  parseTags,
  titleCase,
} from "../utils/formatters";
import {
  MapPin,
  DollarSign,
  Thermometer,
  ArrowRight,
  Calendar,
  Globe2,
} from "lucide-react";
import { TravelHero, PageMessage } from "../components/TravelHero";
import LoadingState from "../components/LoadingState";
export function DestinationDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;

    setIsLoading(true);
    setError("");
    destinationsApi
      .get(Number(id))
      .then(setDestination)
      .catch((err) => setError(errorMessage(err, "Destination not found.")))
      .finally(() => setIsLoading(false));
  }, [id, isAuthenticated]);

  if (loading || isLoading)
    return (
      <LoadingState fullPage message="A closer look at your destination…" />
    );
  if (error || !destination)
    return (
      <PageMessage title={error || "This destination could not be found."}>
        <Link
          to="/destinations"
          className="travel-button travel-button-outline"
        >
          Back to destinations
          <ArrowRight size={16} />
        </Link>
      </PageMessage>
    );
  const tags = parseTags(destination.tags);
  return (
    <div>
      <TravelHero
        image={destinationImage(destination)}
        eyebrow={`${destination.country}${destination.continent ? " / " + destination.continent : ""}`}
        title={destination.name}
        script="Picture yourself here."
        back={{ to: "/destinations", label: "All destinations" }}
      >
        <div className="flex flex-wrap gap-2">
          {[
            destination.destination_type,
            destination.climate_type,
            destination.budget_level,
          ].map((value, i) => (
            <span
              key={i}
              className="px-3 py-1.5 border border-white/40 text-xs capitalize bg-[#173022]/30"
            >
              {titleCase(value)}
            </span>
          ))}
        </div>
      </TravelHero>
      <div className="travel-container travel-section grid lg:grid-cols-[1fr_340px] gap-12 items-start">
        <article className="py-3">
          <p className="travel-eyebrow text-[#85916e] mb-4">
            A place worth getting to know
          </p>
          <h2 className="editorial-title mb-6">
            A little about {destination.name}
          </h2>
          <p className="text-[#66705c] leading-[2] text-base sm:text-lg">
            {destination.description}
          </p>
          <div className="border-t border-[#d9ddcd] pt-8 mt-10">
            <h3 className="font-bold text-[#344a2f] mb-5">
              Come for the place. Stay for the possibilities.
            </h3>
            <div className="flex flex-wrap gap-2">
              {tags.length ? (
                tags.map((tag) => (
                  <span className="travel-tag px-4 py-2" key={tag}>
                    {tag}
                  </span>
                ))
              ) : (
                <p className="form-hint">
                  Explore the destination and make a plan around your interests.
                </p>
              )}
            </div>
          </div>
          <div className="mt-12 flex items-center gap-5">
            <span className="h-px flex-1 bg-[#d9ddcd]" />
            <span className="font-script text-3xl text-[#8b7957]">
              See where the days take you.
            </span>
            <span className="h-px flex-1 bg-[#d9ddcd]" />
          </div>
        </article>
        <aside className="paper-panel paper-pad lg:sticky lg:top-24">
          <p className="travel-eyebrow text-[#84916c] mb-2">Before you pack</p>
          <h2 className="editorial-title">The field notes</h2>
          <dl className="fact-list mt-2">
            <Fact
              icon={DollarSign}
              label="Budget"
              value={titleCase(destination.budget_level)}
            />
            <Fact
              icon={Thermometer}
              label="Climate"
              value={`${titleCase(destination.climate_type)}${destination.avg_temp_c != null ? " · " + destination.avg_temp_c + "°C average" : ""}`}
            />
            <Fact
              icon={MapPin}
              label="Setting"
              value={titleCase(destination.destination_type)}
            />
            {destination.best_months && (
              <Fact
                icon={Calendar}
                label="Best months to visit"
                value={destination.best_months}
              />
            )}
            {destination.continent && (
              <Fact
                icon={Globe2}
                label="Continent"
                value={destination.continent}
              />
            )}
          </dl>
          <Link
            to={`/generate?destination=${encodeURIComponent(destination.name)}`}
            className="travel-button w-full mt-7"
          >
            Plan a trip here
            <ArrowRight size={16} />
          </Link>
          <p className="form-hint text-center mt-3">
            Your pace. Your interests. Your itinerary.
          </p>
        </aside>
      </div>
    </div>
  );
}
function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div>
      <Icon size={18} className="text-[#7a8e65] shrink-0 mt-1" />
      <div>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    </div>
  );
}

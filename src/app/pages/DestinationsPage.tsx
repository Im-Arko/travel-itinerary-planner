import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Destination,
  destinationsApi,
  DestinationSearchResult,
} from "../services/api";
import {
  destinationImage,
  fallbackTravelImage,
  errorMessage,
  parseTags,
  titleCase,
} from "../utils/formatters";
import { Search, MapPin, AlertCircle, ArrowUpRight } from "lucide-react";
import { TravelHero, travelPhotos } from "../components/TravelHero";
import LoadingState from "../components/LoadingState";
export function DestinationsPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [budgetFilter, setBudgetFilter] = useState("all");
  const [climateFilter, setClimateFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [similarityScores, setSimilarityScores] = useState<
    Record<number, { score: number; reason: string }>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [page,setPage]=useState(0);
  const [total,setTotal]=useState(0);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const params = {
          budget: budgetFilter === "all" ? undefined : budgetFilter,
          climate: climateFilter === "all" ? undefined : climateFilter,
          dest_type: typeFilter === "all" ? undefined : typeFilter,
          limit: 24,
          skip: page*24,
        };

        if (searchQuery.trim()) {
          const response = await destinationsApi.searchPage({
            q: searchQuery.trim(),
            ...params,
          },controller.signal);
          const results=response.items;
          if (!controller.signal.aborted) {
            setDestinations(results.map((r) => r.destination));
            setTotal(response.total);
            // Store similarity scores for badges
            const scores: Record<number, { score: number; reason: string }> =
              {};
            results.forEach((r: DestinationSearchResult) => {
              scores[r.destination.id] = {
                score: Math.round(r.similarity_score * 100),
                reason: r.match_reason,
              };
            });
            setSimilarityScores(scores);
          }
        } else {
          const data = await destinationsApi.page(params,controller.signal);
          if (!controller.signal.aborted) {
            setDestinations(data.items);
            setTotal(data.total);
            setSimilarityScores({});
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(errorMessage(err, "Unable to load destinations."));
          setDestinations([]);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    const timeout = window.setTimeout(load, searchQuery ? 300 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [budgetFilter, climateFilter, isAuthenticated, searchQuery, typeFilter,page]);

  useEffect(()=>setPage(0),[budgetFilter,climateFilter,searchQuery,typeFilter]);

  if (loading) return null;

  return (
    <div>
      <TravelHero
        image={travelPhotos.lake}
        eyebrow="A world of possibilities"
        title="Somewhere out of the ordinary."
        script="Find a place that feels like you."
        description="Follow an old favourite or a brand-new curiosity. Search for a place, or describe the kind of escape you have in mind."
        caption="Let your curiosity lead"
      />
      <div className="travel-container travel-overlap">
        <div
          role="search"
          aria-label="Find destinations"
          className="paper-panel p-5 sm:p-7"
        >
          <div className="grid lg:grid-cols-[1.7fr_1fr_1fr_1fr] sm:grid-cols-2 gap-4 items-end">
            <div className="travel-field">
              <label htmlFor="destination-search">
                What are you looking for?
              </label>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3.5 top-3.5 text-[#7b856f]"
                />
                <input
                  id="destination-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Beaches, old towns, mountain air…"
                  className="travel-input pl-11"
                  maxLength={500}
                />
              </div>
            </div>
            <div className="travel-field">
              <label htmlFor="filter-budget">Your budget</label>
              <select
                id="filter-budget"
                value={budgetFilter}
                onChange={(e) => setBudgetFilter(e.target.value)}
                className="travel-input"
              >
                <option value="all">Any budget</option>
                {["budget", "moderate", "luxury"].map((v) => (
                  <option key={v} value={v}>
                    {titleCase(v)}
                  </option>
                ))}
              </select>
            </div>
            <div className="travel-field">
              <label htmlFor="filter-climate">The weather</label>
              <select
                id="filter-climate"
                value={climateFilter}
                onChange={(e) => setClimateFilter(e.target.value)}
                className="travel-input"
              >
                <option value="all">Any climate</option>
                {["tropical", "temperate", "arid", "cold", "mediterranean"].map(
                  (v) => (
                    <option key={v} value={v}>
                      {titleCase(v)}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="travel-field">
              <label htmlFor="filter-type">The scenery</label>
              <select
                id="filter-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="travel-input"
              >
                <option value="all">Any setting</option>
                {[
                  "city",
                  "beach",
                  "mountain",
                  "countryside",
                  "adventure",
                  "cultural",
                ].map((v) => (
                  <option key={v} value={v}>
                    {titleCase(v)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="travel-container pb-20">
        <div className="section-intro">
          <div>
            <p className="travel-eyebrow text-[#7c866b] mb-2">
              The destination edit
            </p>
            <h2 className="editorial-title">
              {searchQuery
                ? "Places for your kind of escape"
                : "Let somewhere surprise you"}
            </h2>
          </div>
          <p role="status" className="shrink-0 pt-2">
            {isLoading
              ? "Finding places…"
              : `${total} matching catalog places`}
          </p>
        </div>
        <p className="form-hint mb-6">These are curated destination profiles. Plan a Trip can resolve cities worldwide and will confirm the intended country and region.</p>
        {error && (
          <div role="alert" className="travel-error mb-6">
            <AlertCircle size={18} className="shrink-0 mt-1" />
            {error}
          </div>
        )}
        {isLoading ? (
          <LoadingState
            message="Finding your next adventure…"
            subMessage="A world of possibilities is on its way."
          />
        ) : destinations.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
            {destinations.map((destination, index) => (
              <Link
                key={destination.id}
                to={`/destinations/${destination.id}`}
                className="photo-card group"
              >
                <div className="relative overflow-hidden">
                  <img onError={fallbackTravelImage}
                    src={destinationImage(destination)}
                    alt={destination.name}
                    loading="lazy"
                    className="photo-card-image"
                  />
                  <span className="photo-card-badge">
                    {titleCase(destination.destination_type)} ·{" "}
                    {titleCase(destination.budget_level)}
                  </span>
                  <span className="absolute top-3 right-3 font-stencil text-xs text-white bg-[#1e392a]/75 px-2 py-1">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="photo-card-body">
                  <p className="flex gap-1.5 items-center text-xs mb-2">
                    <MapPin size={13} />
                    {destination.country}
                  </p>
                  <h2>{destination.name}</h2>
                  <p className="mt-3 line-clamp-2">{destination.description}</p>
                  {similarityScores[destination.id] && (
                    <p className="mt-3 text-[#46613b] border-l-2 border-[#a2b58e] pl-3 line-clamp-2">
                      {similarityScores[destination.id].reason}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-5">
                    {parseTags(destination.tags)
                      .slice(0, 3)
                      .map((tag) => (
                        <span className="travel-tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-[#e1e4d7] pt-4 mt-5 text-xs font-bold text-[#49663d]">
                    Take a closer look
                    <ArrowUpRight
                      size={17}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          !error && (
            <div className="paper-panel px-6 py-14 text-center">
              <Search
                size={30}
                strokeWidth={1}
                className="mx-auto text-[#7d8f6c] mb-5"
              />
              <h2 className="editorial-title mb-3">
                A different direction, perhaps?
              </h2>
              <p className="form-hint max-w-md mx-auto mb-6">
                No destinations fit these filters. Open up your search and see
                what catches your eye.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setBudgetFilter("all");
                  setClimateFilter("all");
                  setTypeFilter("all");
                }}
                className="travel-button travel-button-outline"
              >
                Explore all destinations
              </button>
            </div>
          )
        )}
        {total>24&&<nav aria-label="Destination pages" className="flex justify-between items-center gap-4 mt-8"><button className="travel-button travel-button-outline" disabled={page===0||isLoading} onClick={()=>setPage(value=>value-1)}>Previous</button><span>Page {page+1} of {Math.ceil(total/24)}</span><button className="travel-button travel-button-outline" disabled={(page+1)*24>=total||isLoading} onClick={()=>setPage(value=>value+1)}>Next</button></nav>}
      </div>
    </div>
  );
}

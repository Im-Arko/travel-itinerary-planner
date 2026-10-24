import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Itinerary, itinerariesApi } from "../services/api";
import { errorMessage, titleCase } from "../utils/formatters";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { TravelHero, travelPhotos } from "../components/TravelHero";
import { useDestinationPhoto } from "../components/useDestinationPhoto";
import LoadingState from "../components/LoadingState";
import {
  Heart,
  MapPin,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Trash2,
} from "lucide-react";
export function SavedItinerariesPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Itinerary | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError("");
    itinerariesApi
      .list({ limit: 50 })
      .then(setItineraries)
      .catch((err) =>
        setError(errorMessage(err, "Unable to load itineraries.")),
      )
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const toggleFavorite = async (itinerary: Itinerary) => {
    const previous = itineraries;
    setItineraries((prev) =>
      prev.map((item) =>
        item.id === itinerary.id
          ? { ...item, is_favorite: !item.is_favorite }
          : item,
      ),
    );
    try {
      await itinerariesApi.update(itinerary.id, {
        is_favorite: !itinerary.is_favorite,
      });
    } catch (err) {
      setItineraries(previous);
      setError(errorMessage(err, "Unable to update favorite status."));
    }
  };

  const handleDelete = async (itinerary: Itinerary) => {
    setDeleteTarget(null);
    setDeletingId(itinerary.id);
    const previous = itineraries;
    setItineraries((prev) => prev.filter((item) => item.id !== itinerary.id));
    try {
      await itinerariesApi.remove(itinerary.id);
    } catch (err) {
      setItineraries(previous);
      setError(errorMessage(err, "Unable to delete itinerary."));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return null;
  const favorites = itineraries.filter((i) => i.is_favorite).length;
  const visibleTrips = favoritesOnly
    ? itineraries.filter((i) => i.is_favorite)
    : itineraries;
  return (
    <div>
      <TravelHero
        image={travelPhotos.rail}
        eyebrow="The journeys you keep"
        title="A shelf full of possibilities."
        script="Some plans are worth holding on to."
        description="The first ideas, the almost-booked escapes, and the trips you keep coming back to. Your travel plans, all in one place."
        caption="Your travel journal"
      >
        <Link
          to="/generate"
          className="inline-flex items-center gap-2 text-sm font-bold text-white border-b border-[#e6ddc1] pb-2"
        >
          Make room for another adventure
          <ArrowUpRight size={17} />
        </Link>
      </TravelHero>
      <div className="travel-container pb-20">
        <div className="section-intro flex-wrap">
          <div>
            <p className="travel-eyebrow text-[#7c866b] mb-2">
              Collected along the way
            </p>
            <h2 className="editorial-title">Your saved itineraries</h2>
          </div>
          <div className="flex gap-2" aria-label="Filter saved trips">
            <button
              className="travel-choice"
              aria-pressed={!favoritesOnly}
              onClick={() => setFavoritesOnly(false)}
            >
              All trips <span className="opacity-65">{itineraries.length}</span>
            </button>
            <button
              className="travel-choice"
              aria-pressed={favoritesOnly}
              onClick={() => setFavoritesOnly(true)}
            >
              <Heart size={14} />
              Favourites <span className="opacity-65">{favorites}</span>
            </button>
          </div>
        </div>
        {error && (
          <div role="alert" className="travel-error mb-6">
            <AlertCircle size={18} className="shrink-0 mt-1" />
            {error}
          </div>
        )}
        {isLoading ? (
          <LoadingState message="Opening your travel journal…" />
        ) : visibleTrips.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleTrips.map((itinerary) => (
              <SavedTripCard
                key={itinerary.id}
                itinerary={itinerary}
                toggleFavorite={() => toggleFavorite(itinerary)}
                onDelete={() => setDeleteTarget(itinerary)}
                deleting={deletingId === itinerary.id}
              />
            ))}
          </div>
        ) : (
          <div className="paper-panel grid md:grid-cols-2 overflow-hidden">
            <img
              src={travelPhotos.coast}
              alt="A palm-lined beach waiting to be explored"
              loading="lazy"
              className="w-full h-52 md:h-full object-cover"
            />
            <div className="paper-pad flex flex-col items-start justify-center">
              <p className="travel-eyebrow text-[#8b9475] mb-3">
                {favoritesOnly
                  ? "Your favourites"
                  : "The first page is waiting"}
              </p>
              <h2 className="editorial-title mb-4">
                {favoritesOnly
                  ? "Keep your favourites close."
                  : "Every trip starts somewhere."}
              </h2>
              <p className="text-sm leading-7 text-[#6d7562] mb-7">
                {favoritesOnly
                  ? "Tap the heart on a saved trip to find it here whenever you need a little inspiration."
                  : "Turn that place you keep thinking about into a plan. Your itinerary will be saved here, ready when you are."}
              </p>
              {favoritesOnly ? (
                <button
                  onClick={() => setFavoritesOnly(false)}
                  className="travel-button travel-button-outline"
                >
                  See all trips
                  <ArrowRight size={16} />
                </button>
              ) : (
                <Link to="/generate" className="travel-button">
                  Plan your first trip
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </div>
        )}
        {deleteTarget && (
          <DeleteConfirmModal
            title={deleteTarget.title}
            onConfirm={() => handleDelete(deleteTarget)}
            onCancel={() => setDeleteTarget(null)}
            isDeleting={deletingId === deleteTarget.id}
          />
        )}
      </div>
    </div>
  );
}
function SavedTripCard({
  itinerary,
  toggleFavorite,
  onDelete,
  deleting,
}: {
  itinerary: Itinerary;
  toggleFavorite: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const photo = useDestinationPhoto(itinerary.destination_id);
  return (
    <article className="photo-card">
      <div className="relative overflow-hidden">
        <Link
          to={`/itineraries/${itinerary.id}`}
          tabIndex={-1}
          aria-hidden="true"
        >
          <img src={photo} alt="" loading="lazy" className="photo-card-image" />
        </Link>
        <span className="photo-card-badge">
          {itinerary.duration_days} days · {titleCase(itinerary.budget)}
        </span>
        <div className="photo-card-actions">
          <button
            onClick={toggleFavorite}
            className="icon-button"
            aria-label={`${itinerary.is_favorite ? "Unfavourite" : "Favourite"} ${itinerary.title}`}
            aria-pressed={itinerary.is_favorite}
          >
            <Heart
              size={17}
              className={
                itinerary.is_favorite ? "fill-[#b84b3b] text-[#b84b3b]" : ""
              }
            />
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="icon-button"
            aria-label={`Delete ${itinerary.title}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="photo-card-body">
        <p className="flex gap-1.5 items-center mb-2">
          <MapPin size={13} />
          {itinerary.destination_name}
        </p>
        <h2>
          <Link to={`/itineraries/${itinerary.id}`}>{itinerary.title}</Link>
        </h2>
        {itinerary.summary && (
          <p className="line-clamp-2 mt-3">{itinerary.summary}</p>
        )}
        <div className="flex items-center justify-between gap-3 mt-5 pb-4 border-b border-[#e0e3d4]">
          <span className="travel-tag">{itinerary.status}</span>
          <span className="text-[.65rem] text-[#7a816d]">
            {new Date(itinerary.generated_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        <Link
          to={`/itineraries/${itinerary.id}`}
          className="flex justify-between items-center text-xs font-bold text-[#49663d] mt-4"
        >
          Open the journal
          <ArrowUpRight size={17} />
        </Link>
      </div>
    </article>
  );
}

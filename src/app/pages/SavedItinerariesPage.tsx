import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ItinerarySummary, itinerariesApi } from "../services/api";
import { errorMessage, titleCase, fallbackTravelImage } from "../utils/formatters";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { TravelHero, travelPhotos } from "../components/TravelHero";
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
  const [itineraries, setItineraries] = useState<ItinerarySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ItinerarySummary | null>(null);
  const [page,setPage]=useState(0);
  const [totals,setTotals]=useState({total:0,all:0,favorites:0});
  const [revision,setRevision]=useState(0);
  const [busyId,setBusyId]=useState<number|null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/login");
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller=new AbortController();
    setIsLoading(true);
    setError("");
    itinerariesApi
      .page({ limit:24,skip:page*24,favorites:favoritesOnly?true:undefined },controller.signal)
      .then(result=>{if(controller.signal.aborted)return;setItineraries(result.items);setTotals({total:result.total,all:result.total_all,favorites:result.total_favorites});if(!result.items.length&&page>0)setPage(Math.max(0,Math.ceil(result.total/24)-1));})
      .catch((err) =>
        !controller.signal.aborted&&setError(errorMessage(err, "Unable to load itineraries.")),
      )
      .finally(() => {if(!controller.signal.aborted)setIsLoading(false);});
    return()=>controller.abort();
  }, [isAuthenticated,page,favoritesOnly,revision]);

  const toggleFavorite = async (itinerary: ItinerarySummary) => {
    if(busyId!==null||deletingId!==null)return;
    setBusyId(itinerary.id);
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
      setRevision(value=>value+1);
    } catch (err) {
      setItineraries(previous);
      setError(errorMessage(err, "Unable to update favorite status."));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (itinerary: ItinerarySummary) => {
    if(busyId!==null||deletingId!==null)return;
    setDeleteTarget(null);
    setDeletingId(itinerary.id);
    const previous = itineraries;
    setItineraries((prev) => prev.filter((item) => item.id !== itinerary.id));
    try {
      await itinerariesApi.remove(itinerary.id);
      setRevision(value=>value+1);
    } catch (err) {
      setItineraries(previous);
      setError(errorMessage(err, "Unable to delete itinerary."));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return null;
  const favorites = totals.favorites;
  const visibleTrips = itineraries;
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
              onClick={() => {setFavoritesOnly(false);setPage(0);}}
            >
              All trips <span className="opacity-65">{totals.all}</span>
            </button>
            <button
              className="travel-choice"
              aria-pressed={favoritesOnly}
              onClick={() => {setFavoritesOnly(true);setPage(0);}}
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
                deleting={deletingId!==null||busyId!==null}
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
        {totals.total>24&&<nav aria-label="Saved trip pages" className="flex justify-between items-center gap-4 mt-8"><button className="travel-button travel-button-outline" disabled={page===0||isLoading} onClick={()=>setPage(value=>value-1)}>Previous</button><span>Page {page+1} of {Math.ceil(totals.total/24)}</span><button className="travel-button travel-button-outline" disabled={(page+1)*24>=totals.total||isLoading} onClick={()=>setPage(value=>value+1)}>Next</button></nav>}
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
  itinerary: ItinerarySummary;
  toggleFavorite: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const photo = itinerary.image_url || '/icons/plan-illustration.svg';
  return (
    <article className="photo-card">
      <div className="relative overflow-hidden">
        <Link
          to={`/itineraries/${itinerary.id}`}
          tabIndex={-1}
          aria-hidden="true"
        >
          <img onError={fallbackTravelImage} src={photo} alt="" loading="lazy" className="photo-card-image" />
        </Link>
        <span className="photo-card-badge">
          {itinerary.duration_days} days · {titleCase(itinerary.budget)}
        </span>
        <div className="photo-card-actions">
          <button
            onClick={toggleFavorite}
            disabled={deleting}
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

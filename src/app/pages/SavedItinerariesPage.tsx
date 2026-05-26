import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Itinerary, itinerariesApi } from '../services/api';
import { errorMessage } from '../utils/formatters';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import {
  Heart, Calendar, MapPin, Star, DollarSign,
  AlertCircle, Luggage, Wand2, ArrowRight, Trash2,
} from 'lucide-react';

export function SavedItinerariesPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState('');
  const [deletingId,  setDeletingId]  = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Itinerary | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/login');
  }, [isAuthenticated, loading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError('');
    itinerariesApi.list({ limit: 50 })
      .then(setItineraries)
      .catch(err => setError(errorMessage(err, 'Unable to load itineraries.')))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const toggleFavorite = async (itinerary: Itinerary) => {
    const previous = itineraries;
    setItineraries(prev =>
      prev.map(item =>
        item.id === itinerary.id ? { ...item, is_favorite: !item.is_favorite } : item
      )
    );
    try {
      await itinerariesApi.update(itinerary.id, { is_favorite: !itinerary.is_favorite });
    } catch (err) {
      setItineraries(previous);
      setError(errorMessage(err, 'Unable to update favorite status.'));
    }
  };

  const handleDelete = async (itinerary: Itinerary) => {
    setDeleteTarget(null);
    setDeletingId(itinerary.id);
    const previous = itineraries;
    setItineraries(prev => prev.filter(item => item.id !== itinerary.id));
    try {
      await itinerariesApi.remove(itinerary.id);
    } catch (err) {
      setItineraries(previous);
      setError(errorMessage(err, 'Unable to delete itinerary.'));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return null;

  const favorites = itineraries.filter(i => i.is_favorite).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4" style={{ background: '#FAF6F1' }}>
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-sans mb-5 border"
            style={{ background: '#FCF2F3', borderColor: '#F2C5C9', color: '#C4737A' }}
          >
            <Heart className="w-3.5 h-3.5" />
            Your Collection
          </div>
          <h1 className="font-serif text-4xl font-bold mb-2" style={{ color: '#2C2420' }}>
            Saved itineraries
          </h1>
          <p className="font-sans text-base" style={{ color: '#9A8E84' }}>
            Your personalized travel plans, ready whenever you are.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="banner-error mb-6">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 animate-pulse"
              style={{ background: '#F5EDE3' }}>
              <Calendar className="w-7 h-7" style={{ color: '#C0392B' }} />
            </div>
            <p className="font-sans text-sm" style={{ color: '#9A8E84' }}>
              Loading your itineraries…
            </p>
          </div>
        ) : itineraries.length > 0 ? (
          <>
            {/* ── Stats ── */}
            <div className="flex flex-wrap gap-3 mb-10">
              {/* Total */}
              <div
                className="flex items-center gap-3 px-5 py-3 rounded-2xl border"
                style={{ background: '#FFFFFF', borderColor: '#E8DFD4', boxShadow: '0 2px 8px rgba(44,36,32,0.05)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: '#FAF0EE' }}>
                  <Calendar className="w-4 h-4" style={{ color: '#C0392B' }} />
                </div>
                <div>
                  <p className="text-xs font-sans" style={{ color: '#9A8E84' }}>Total trips</p>
                  <p className="font-bold font-serif text-lg leading-tight" style={{ color: '#2C2420' }}>
                    {itineraries.length}
                  </p>
                </div>
              </div>

              {/* Favorites */}
              <div
                className="flex items-center gap-3 px-5 py-3 rounded-2xl border"
                style={{ background: '#FFFFFF', borderColor: '#E8DFD4', boxShadow: '0 2px 8px rgba(44,36,32,0.05)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: '#FCF2F3' }}>
                  <Heart className="w-4 h-4" style={{ color: 'white' }} />
                </div>
                <div>
                  <p className="text-xs font-sans" style={{ color: '#9A8E84' }}>Favorites</p>
                  <p className="font-bold font-serif text-lg leading-tight" style={{ color: '#2C2420' }}>
                    {favorites}
                  </p>
                </div>
              </div>
            </div>

            {/* Delete modal */}
            {deleteTarget && (
              <DeleteConfirmModal
                title={deleteTarget.title}
                onConfirm={() => handleDelete(deleteTarget)}
                onCancel={() => setDeleteTarget(null)}
                isDeleting={deletingId === deleteTarget.id}
              />
            )}

            {/* ── Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {itineraries.map(itinerary => (
                <Link
                  key={itinerary.id}
                  to={`/itineraries/${itinerary.id}`}
                  className="group block rounded-2xl overflow-hidden border transition-all duration-300"
                  style={{
                    background:  '#FFFFFF',
                    borderColor: '#E8DFD4',
                    boxShadow:   '0 2px 8px rgba(44,36,32,0.06)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(44,36,32,0.12)';
                    (e.currentTarget as HTMLElement).style.transform  = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(44,36,32,0.06)';
                    (e.currentTarget as HTMLElement).style.transform  = 'translateY(0)';
                  }}
                >
                  {/* ── Card header ── */}
                  <div className="relative p-5" style={{ background: '#852E47' }}>
                    {/*
                      FIX: buttons are in their OWN row at the top, title below.
                      This prevents any overlap regardless of title length.
                    */}
                    <div className="flex items-center justify-between mb-3">
                      {/* Left: destination pill */}
                      <span
                        className="inline-flex items-center gap-1 text-xs font-sans px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
                      >
                        <MapPin className="w-3 h-3" />
                        {itinerary.destination_name}
                      </span>

                      {/* Right: action buttons — no overlap possible */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={e => { e.preventDefault(); toggleFavorite(itinerary); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                          style={{ background: 'rgba(255,255,255,0.12)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(196,115,122,0.40)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                          title="Favourite"
                        >
                          <Heart
                            className="w-4 h-4"
                            style={{
                              fill:  itinerary.is_favorite ? '#eb3167' : 'transparent',
                              color: itinerary.is_favorite ? '#ff2161' : 'rgba(255,255,255,0.65)',
                            }}
                          />
                        </button>

                        <button
                          onClick={e => { e.preventDefault(); setDeleteTarget(itinerary); }}
                          disabled={deletingId === itinerary.id}
                          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-40"
                          style={{ background: 'rgba(255,255,255,0.12)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,57,43,0.45)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                          title="Delete"
                        >
                          <Trash2
                            className={`w-4 h-4 ${deletingId === itinerary.id ? 'animate-pulse' : ''}`}
                            style={{ color: 'rgba(255,255,255,0.65)' }}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Title — full width, no padding workaround needed */}
                    <h3 className="font-serif text-xl font-bold text-white leading-snug">
                      {itinerary.title}
                    </h3>
                    {itinerary.summary && (
                      <p className="text-sm mt-1 line-clamp-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {itinerary.summary}
                      </p>
                    )}
                  </div>

                  {/* ── Card body ── */}
                  <div className="p-5">
                    <div className="space-y-2.5 mb-4">
                      <div className="flex items-center gap-2 text-sm font-sans">
                        <Calendar className="w-4 h-4 shrink-0" style={{ color: '#C0392B' }} />
                        <span style={{ color: '#5E4D3D' }}>
                          {itinerary.duration_days} days
                        </span>
                        <span style={{ color: '#D4C4B5' }}>·</span>
                        <span style={{ color: '#9A8E84' }}>
                          {new Date(itinerary.generated_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm font-sans">
                        <DollarSign className="w-4 h-4 shrink-0" style={{ color: '#C0392B' }} />
                        <span className="capitalize" style={{ color: '#5E4D3D' }}>
                          {itinerary.budget}
                        </span>
                      </div>
                    </div>

                    {/* Rating & status */}
                    <div
                      className="flex items-center justify-between pt-3 mb-4 border-t"
                      style={{ borderColor: '#E8DFD4' }}
                    >
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className="w-3.5 h-3.5"
                            style={{
                              fill:  star <= (itinerary.rating || 0) ? '#D4956A' : 'transparent',
                              color: star <= (itinerary.rating || 0) ? '#D4956A' : '#E8DFD4',
                            }}
                          />
                        ))}
                      </div>
                      <span
                        className="text-xs font-medium font-sans px-2.5 py-1 rounded-full capitalize border"
                        style={{ background: '#FAF6F1', borderColor: '#E8DFD4', color: '#7A6E65' }}
                      >
                        {itinerary.status}
                      </span>
                    </div>

                    {/* CTA */}
                    <div
                      className="flex items-center text-sm font-medium font-sans gap-1 transition-all duration-200 group-hover:gap-2"
                      style={{ color: '#C0392B' }}
                    >
                      View details <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center py-28 px-6 text-center">
            <div className="relative mb-10">
              <div
                className="w-28 h-28 rounded-3xl flex items-center justify-center mx-auto"
                style={{ background: '#FAF0EE', border: '1px solid #F4C5C0' }}
              >
                <Luggage className="w-12 h-12" style={{ color: '#C0392B' }} />
              </div>
              {/* Floating rose dot */}
              <div
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: '#FCF2F3', border: '1px solid #F2C5C9' }}
              >
                <Star className="w-3 h-3" style={{ fill: '#C4737A', color: '#C4737A' }} />
              </div>
              {/* Sage dot */}
              <div
                className="absolute -bottom-1 -left-2 w-4 h-4 rounded-full"
                style={{ background: '#C1DCC4' }}
              />
              {/* Dotted path */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: i % 2 === 0 ? '#E8DFD4' : '#D4C4B5' }}
                  />
                ))}
              </div>
            </div>

            <h3 className="font-serif text-2xl font-semibold mb-3" style={{ color: '#2C2420' }}>
              Your next adventure awaits
            </h3>
            <p className="font-sans text-base mb-8 max-w-xs leading-relaxed" style={{ color: '#9A8E84' }}>
              Generate your first personalized itinerary and it'll live here, ready whenever you are.
            </p>

            <Link
              to="/generate"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold font-sans text-white transition-all group"
              style={{
                background:  '#C0392B',
                boxShadow:   '0 4px 16px rgba(192,57,43,0.30)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#A12F24')}
              onMouseLeave={e => (e.currentTarget.style.background = '#C0392B')}
            >
              <Wand2 className="w-5 h-5" />
              Generate your first trip
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Feature pills */}
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              {[
                { label: 'AI-powered',          color: '#C0392B', bg: '#FAF0EE' },
                //{ label: 'Vector search',        color: '#4C6950', bg: '#F2F7F2' },
                { label: 'Personalized for you', color: '#C4737A', bg: '#FCF2F3' },
              ].map(({ label, color, bg }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans border"
                  style={{ background: bg, color, borderColor: color + '33' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
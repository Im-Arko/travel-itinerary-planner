const interestIcons: Record<string, string> = {
  beach: 'beach', beaches: 'beach', food: 'food', hiking: 'hiking',
  'adventure sports': 'hiking', history: 'history', art: 'art',
  nightlife: 'nightlife', wellness: 'wellness', photography: 'photography',
  wildlife: 'wildlife', mountains: 'mountains', cities: 'cities', shopping: 'shopping',
};

/** Local SVG artwork; the adjacent label supplies the accessible name. */
export function InterestIcon({ interest, className = '' }: { interest: string; className?: string }) {
  const icon = interestIcons[interest.toLowerCase()];
  if (!icon) return null;
  return (
    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FAF0EE] ${className}`} aria-hidden="true">
      <img src={`/icons/interests/${icon}.svg`} alt="" width={18} height={18} />
    </span>
  );
}

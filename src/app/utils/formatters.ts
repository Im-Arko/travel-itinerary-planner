import { Destination } from '../services/api';

export const titleCase = (value: string | null | undefined) =>
  value ? value.replace(/[_-]/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : 'Any';

export const parseTags = (tags: string | null | undefined): string[] => {
  if (!tags) return [];

  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // Backend seed data may store tags as comma-separated text.
  }

  return tags
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
};

export const destinationImage = (destination?: Pick<Destination, 'image_url'> | null) =>
  destination?.image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';

export const errorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    return response?.data?.detail || fallback;
  }
  if (error instanceof TypeError) {
    return `${fallback} Check that the backend is running and reachable from the browser.`;
  }
  return fallback;
};

export const normalizeBudget = (value: string | null | undefined) => {
  if (value === 'low' || value === 'Budget ($500-1500)' || value === 'budget') return 'budget';
  if (value === 'medium' || value === 'Moderate ($1500-3000)' || value === 'moderate') return 'moderate';
  if (value === 'high' || value === 'Luxury ($3000+)' || value === 'luxury') return 'luxury';
  return 'moderate';
};

export const normalizeClimate = (value: string | null | undefined) => {
  if (!value) return 'any';
  const lower = value.toLowerCase();
  if (lower === 'desert') return 'arid';
  if (lower === 'arctic' || lower === 'mountain') return 'cold';
  if (['any', 'tropical', 'temperate', 'arid', 'cold', 'mediterranean'].includes(lower)) return lower;
  return 'any';
};

export const normalizeDestinationType = (value: string | null | undefined) => {
  if (!value) return 'any';
  const lower = value.toLowerCase();
  if (lower === 'island') return 'beach';
  if (lower === 'nature' || lower === 'historical') return 'cultural';
  if (['any', 'beach', 'mountain', 'city', 'countryside', 'adventure', 'cultural'].includes(lower)) return lower;
  return 'any';
};

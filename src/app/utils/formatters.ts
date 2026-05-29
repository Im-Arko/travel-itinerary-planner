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

// Unique Unsplash photos for different destination types
const destinationTypeImages: Record<string, string> = {
  beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  mountain: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  city: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80',
  countryside: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
  adventure: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
  cultural: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=1200&q=80',
  tropical: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  temperate: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
  arid: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1200&q=80',
  cold: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=1200&q=80',
  mediterranean: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80',
};

// Hash function to get consistent index from destination name
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Fallback generic travel images
const fallbackImages = [
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=80',
];

export const destinationImage = (destination?: Destination | null) => {
  if (destination?.image_url) return destination.image_url;
  
  // Try to match by destination type
  if (destination?.destination_type) {
    const typeKey = destination.destination_type.toLowerCase();
    if (destinationTypeImages[typeKey]) {
      return destinationTypeImages[typeKey];
    }
  }
  
  // Try to match by climate
  if (destination?.climate_type) {
    const climateKey = destination.climate_type.toLowerCase();
    if (destinationTypeImages[climateKey]) {
      return destinationTypeImages[climateKey];
    }
  }
  
  // Use hash of name for consistent unique image
  if (destination?.name) {
    const index = hashString(destination.name) % fallbackImages.length;
    return fallbackImages[index];
  }
  
  return fallbackImages[0];
};

export const errorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    return response?.data?.detail || fallback;
  }
  if (error instanceof TypeError) {
    return `${fallback} Network error.`;
  }
  return fallback;
};

export const normalizeBudget = (value: string | null | undefined) => {
  if (value === 'low' || value === 'Low ($500-1500)' || value === 'budget') return 'budget';
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

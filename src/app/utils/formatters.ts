import { Destination } from '../services/api';
import type { SyntheticEvent } from 'react';

export function fallbackTravelImage(event:SyntheticEvent<HTMLImageElement>) {
  const image=event.currentTarget;
  if(image.dataset.fallback)return;
  image.dataset.fallback='true';
  image.src='/icons/plan-illustration.svg';
  image.alt='Travel illustration; destination photo unavailable';
}

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

export const destinationImage = (destination?: Destination | null) => destination?.image_url || '/icons/plan-illustration.svg';

export const errorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(item => typeof item?.msg === 'string' ? item.msg : 'Please check your input.').join(' ');
    if (detail && typeof detail === 'object' && 'message' in detail && typeof detail.message === 'string') return detail.message;
    return fallback;
  }
  if (error instanceof TypeError) {
    return `${fallback} Network error.`;
  }
  return error instanceof Error ? error.message : fallback;
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

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Destination {
  id: number;
  name: string;
  country: string;
  continent: string | null;
  description: string;
  climate_type: string;
  destination_type: string;
  budget_level: string;
  best_months: string | null;
  avg_temp_c: number | null;
  tags: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface DestinationSearchResult {
  destination: Destination;
  similarity_score: number;
  match_reason: string;
}

export interface DayPlan {
  day_number: number;
  theme: string;
  morning: string;
  afternoon: string;
  evening: string;
  accommodation: string | null;
  estimated_cost: number | null;
  tips: string | null;
}

export interface Itinerary {
  id: number;
  user_id: number;
  destination_id: number | null;
  title: string;
  destination_name: string;
  duration_days: number;
  budget: string;
  travel_style: string | null;
  summary: string | null;
  full_itinerary: string;
  status: string;
  is_favorite: boolean;
  rating: number | null;
  user_notes: string | null;
  generated_at: string;
  updated_at: string;
}

export interface ItineraryWithDays extends Itinerary {
  days: DayPlan[];
}

export interface ItineraryGenerateRequest {
  budget: string;
  preferred_climate?: string;
  destination_type?: string;
  trip_duration: number;
  travel_style?: string;
  interests?: string[];
  destination_hint?: string;
}

export interface UserPreference {
  id: number;
  user_id: number;
  budget: string;
  preferred_climate: string;
  destination_type: string;
  trip_duration: number;
  travel_style: string;
  interests: string[];
  dietary_needs: string | null;
  accessibility: boolean;
  created_at: string;
  updated_at: string;
}

export type UserPreferencePayload = Omit<UserPreference, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

const TOKEN_KEY = 'access_token';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);

export const setAccessToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearAccessToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);

  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const contentType = response.headers.get('Content-Type') || '';
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : { detail: await response.text().catch(() => response.statusText) };
    throw { response: { data, status: response.status } };
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function queryString(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : '';
}

export const authApi = {
  async register(payload: {
    email: string;
    username: string;
    password: string;
    full_name: string;
  }) {
    return request<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(email: string, password: string) {
    const form = new URLSearchParams();
    form.set('username', email);
    form.set('password', password);

    return request<{ access_token: string; token_type: string }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
  },

  async me() {
    return request<User>('/api/auth/me');
  },
};

export const destinationsApi = {
  async list(params: {
    budget?: string;
    climate?: string;
    dest_type?: string;
    skip?: number;
    limit?: number;
  } = {}) {
    return request<Destination[]>(`/api/destinations/${queryString(params)}`);
  },

  async search(params: {
    q: string;
    budget?: string;
    climate?: string;
    dest_type?: string;
    limit?: number;
  }) {
    return request<DestinationSearchResult[]>(`/api/destinations/search${queryString(params)}`);
  },

  async get(id: number) {
    return request<Destination>(`/api/destinations/${id}`);
  },

  async ingest(destinationIds?: number[]) {
    return request<{ ingested: number; message: string }>('/api/destinations/ingest', {
      method: 'POST',
      body: JSON.stringify({ destination_ids: destinationIds ?? null }),
    });
  },

  async vectorCount() {
    return request<{ count: number }>('/api/destinations/vector/count');
  },
};

export const itinerariesApi = {
  async generate(payload: ItineraryGenerateRequest) {
    return request<ItineraryWithDays>('/api/itineraries/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async list(params: { status?: string; favorites?: boolean; skip?: number; limit?: number } = {}) {
    return request<Itinerary[]>(`/api/itineraries/${queryString(params)}`);
  },

  async get(id: number) {
    return request<ItineraryWithDays>(`/api/itineraries/${id}`);
  },

  async update(id: number, payload: Partial<Pick<Itinerary, 'title' | 'status' | 'is_favorite' | 'rating' | 'user_notes'>>) {
    return request<Itinerary>(`/api/itineraries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async remove(id: number) {
    await request<void>(`/api/itineraries/${id}`, { method: 'DELETE' });
  },
};

export const preferencesApi = {
  async get() {
    return request<UserPreference>('/api/preferences/');
  },

  async save(payload: UserPreferencePayload) {
    return request<UserPreference>('/api/preferences/', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

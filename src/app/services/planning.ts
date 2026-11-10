import { request } from "./api";

export interface Place {
  id: number;
  name: string;
  country: string;
  country_code: string;
  region: string;
  latitude: number;
  longitude: number;
  timezone: string;
  label: string;
  source_url: string;
}
export interface Activity {
  slot: "morning" | "afternoon" | "evening";
  attraction_id: string;
  place_id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  source_url: string;
  checked_at: string;
  opening_hours: string | null;
  opening_status: string;
  accessibility: string;
  price: number | null;
  map_url: string;
  user_note: string;
}
export interface TravelLeg {
  to: string;
  distance_km: number;
  estimated_minutes: number;
  method: string;
  status: string;
}
export interface RichDay {
  day_number: number;
  date?: string;
  theme: string;
  morning: string;
  afternoon: string;
  evening: string;
  activities: Activity[];
  travel_legs: TravelLeg[];
  user_note: string;
  user_edited_slots?: string[];
  place?: Place;
}
export interface Research {
  status: string;
  text: string;
  sources: { title: string; url: string }[];
  checked_at?: string;
  place?: string;
  passages?: { text: string; sources: { title: string; url: string }[] }[];
  search_suggestions_html?: string;
}
export interface RichPlan {
  schema_version?: number;
  generation?: {
    mode: string;
    provider: string;
    model: string | null;
    created_at: string;
  };
  places?: Place[];
  image_url?: string | null;
  image_source_url?: string | null;
  image_kind?: string;
  image_credit?: {artist:string;license:string;url:string}|null;
  request?: TripRequest;
  days?: RichDay[];
  warnings?: string[];
  packing_tips?: string[];
  best_time_to_go?: string;
  costs?: {
    currency: string;
    basis: string;
    daily_budget: number | null;
    your_total_budget: number | null;
    estimated_total: number | null;
    status: string;
    exclusions: string;
  };
  current_research?: Research[];
  attribution?: { name: string; url: string }[];
  weather?: {
    status: string;
    reason?: string;
    source_url: string;
    checked_at?: string;
    data?: {
      daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: number[];
      };
    };
  }[];
}
export interface TripRequest {
  destination_hint?: string;
  place_id?: number;
  stops?: { place_id: number; days: number }[];
  budget?: string;
  preferred_climate?: string;
  destination_type?: string;
  trip_duration: number;
  travel_style?: string;
  interests?: string[];
  dietary_needs?: string | null;
  accessibility?: boolean;
  trip_notes?: string;
  start_date?: string | null;
  arrival_time?: string | null;
  departure_time?: string | null;
  origin?: string;
  travelers?: number;
  children_ages?: number[];
  pace?: string;
  transport?: string;
  currency?: string;
  daily_budget?: number | null;
  planner_mode?: "ai" | "guided";
}
export interface PlanningJob {
  request_key: string;
  status: "pending" | "running" | "complete" | "failed" | "cancelled";
  phase: string;
  itinerary_id: number | null;
  error: string | null;
  error_code: number | null;
}
export interface Capabilities {
  ai_available: boolean;
  provider: string | null;
  guided_available: boolean;
  mode_description: string;
  source_attribution: string;
}
export const planningApi = {
  active: () => request<PlanningJob | null>("/api/planning/active"),
  capabilities: () => request<Capabilities>("/api/planning/capabilities"),
  places: (q: string, signal?: AbortSignal) =>
    request<Place[]>("/api/planning/places?q=" + encodeURIComponent(q), {
      signal,
    }),
  start: (key: string, payload: TripRequest) =>
    request<PlanningJob>("/api/planning/jobs/" + key, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  job: (key: string, signal?: AbortSignal) =>
    request<PlanningJob>("/api/planning/jobs/" + key, { signal }),
  cancel: (key: string) =>
    request<PlanningJob>("/api/planning/jobs/" + key, { method: "DELETE" }),
};

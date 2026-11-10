import { useState } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  PreferencesProvider,
  usePreferences,
} from "../context/PreferencesContext";
import {
  preferencesApi,
  itinerariesApi,
  UserPreference,
  ItineraryWithDays,
} from "../services/api";
import { planningApi, Place, PlanningJob } from "../services/planning";
import { PlacePicker } from "../components/PlacePicker";
import { GenerateItineraryPage } from "../pages/GenerateItineraryPage";
import { ItineraryDetailPage } from "../pages/ItineraryDetailPage";
import { SavedItinerariesPage } from "../pages/SavedItinerariesPage";

const auth = vi.hoisted(() => ({
  user: { id: 1, email: "a@example.com" },
  isAuthenticated: true,
  loading: false,
}));
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../components/TravelHero", () => ({
  TravelHero: ({ title, children }: { title: string; children: ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {children}
    </header>
  ),
  PageMessage: ({
    title,
    children,
  }: {
    title: string;
    children: ReactNode;
  }) => (
    <div>
      {title}
      {children}
    </div>
  ),
  travelPhotos: { road: "", rail: "" },
}));
vi.mock("../services/planning", () => ({
  planningApi: {
    capabilities: vi.fn(),
    places: vi.fn(),
    active: vi.fn(),
    start: vi.fn(),
    job: vi.fn(),
    cancel: vi.fn(),
  },
}));
vi.mock("../services/api", async () => ({
  ...(await vi.importActual("../services/api")),
  preferencesApi: { get: vi.fn(), save: vi.fn() },
  itinerariesApi: {
    get: vi.fn(),
    page: vi.fn(),
    update: vi.fn(),
    editDay: vi.fn(),
    regenerateDay: vi.fn(),
    reorder: vi.fn(),
    remove: vi.fn(),
  },
}));

const place: Place = {
  id: 1259425,
  name: "Puducherry",
  country: "India",
  country_code: "IN",
  region: "Puducherry",
  label: "Puducherry, India",
  latitude: 11.93,
  longitude: 79.83,
  timezone: "Asia/Kolkata",
  source_url: "https://www.geonames.org/1259425",
};
const pref: UserPreference = {
  id: 1,
  user_id: 1,
  budget: "moderate",
  preferred_climate: "any",
  destination_type: "cultural",
  trip_duration: 2,
  travel_style: "family",
  interests: ["History"],
  dietary_needs: "Peanut allergy",
  accessibility: true,
  planning_details: {
    destinationHint: "Pondicherry",
    tripNotes: "Quiet afternoons",
  },
  created_at: "2026-11-10T00:00:00Z",
  updated_at: "2026-11-10T00:00:00Z",
};
const pending: PlanningJob = {
  request_key: "d0b79535-3228-46ec-adea-8cdc23992462",
  status: "running",
  phase: "researching",
  itinerary_id: null,
  error: null,
  error_code: null,
};
const trip: ItineraryWithDays = {
  id: 7,
  user_id: 1,
  destination_id: null,
  title: "Two days in Puducherry",
  destination_name: "Puducherry, India",
  duration_days: 2,
  budget: "moderate",
  travel_style: "family",
  summary: "A sourced trip",
  full_itinerary: "{}",
  status: "saved",
  is_favorite: false,
  rating: 4,
  user_notes: "My notes",
  generated_at: "2026-11-10T00:00:00Z",
  updated_at: "2026-11-10T00:00:00Z",
  image_url: null,
  plan: {
    schema_version: 2,
    generation: {
      mode: "ai",
      provider: "google",
      model: "gemini-2.5-flash",
      created_at: "2026-11-10T00:00:00Z",
    },
    places: [place],
    warnings: ["Prices are not quoted."],
  },
  days: [1, 2].map((number) => ({
    day_number: number,
    theme: `Museum day ${number}`,
    morning: "Visit the museum",
    afternoon: "Rest",
    evening: "Free time",
    accommodation: null,
    estimated_cost: null,
    tips: null,
  })),
};
function router(children: ReactNode, path = "/generate") {
  return <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
}
function PreferencesProbe() {
  const state = usePreferences();
  return <p>{state.loading ? "Loading" : JSON.stringify(state.preferences)}</p>;
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: 1, email: "a@example.com" };
  vi.mocked(preferencesApi.get).mockResolvedValue(pref);
  vi.mocked(planningApi.capabilities).mockResolvedValue({
    ai_available: true,
    provider: "google",
    guided_available: true,
    mode_description: "Sourced",
    source_attribution: "Sources",
  });
  vi.mocked(planningApi.active).mockResolvedValue(null);
  vi.mocked(planningApi.places).mockResolvedValue([place]);
  vi.mocked(itinerariesApi.get).mockResolvedValue(trip);
});

describe("account preferences", () => {
  it("loads from the account and hides the previous account immediately", async () => {
    const view = render(
      <PreferencesProvider>
        <PreferencesProbe />
      </PreferencesProvider>,
    );
    await screen.findByText(/Peanut allergy/);
    let resolve!: (value: UserPreference) => void;
    vi.mocked(preferencesApi.get).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    auth.user = { id: 2, email: "b@example.com" };
    view.rerender(
      <PreferencesProvider>
        <PreferencesProbe />
      </PreferencesProvider>,
    );
    expect(screen.queryByText(/Peanut allergy/)).toBeNull();
    expect(screen.getByText("Loading")).toBeTruthy();
    resolve({ ...pref, user_id: 2, dietary_needs: "Vegan" });
    await screen.findByText(/Vegan/);
    expect(screen.queryByText(/Peanut allergy/)).toBeNull();
  });
});

describe("planning interactions", () => {
  it("confirms the exact region for an ambiguous place", async () => {
    const user = userEvent.setup();
    const france = {
      ...place,
      id: 2988507,
      name: "Paris",
      label: "Paris, France",
    };
    const texas = {
      ...place,
      id: 4717560,
      name: "Paris",
      label: "Paris, Texas, United States",
    };
    vi.mocked(planningApi.places).mockResolvedValue([france, texas]);
    function Picker() {
      const [value, setValue] = useState("Paris");
      const [selected, setSelected] = useState<Place | null>(null);
      return (
        <PlacePicker
          label="Destination"
          value={value}
          place={selected}
          onChange={(next, chosen) => {
            setValue(next);
            setSelected(chosen);
          }}
        />
      );
    }
    render(<Picker />);
    await user.click(await screen.findByRole("option", { name: texas.label }));
    expect(screen.getByRole("combobox").getAttribute("value")).toBe(
      texas.label,
    );
    expect(screen.getByText(`Confirmed: ${texas.label}`)).toBeTruthy();
  });
  it("hydrates safety needs, confirms place ID, shows progress and cancels", async () => {
    const user = userEvent.setup();
    vi.mocked(planningApi.start).mockResolvedValue(pending);
    vi.mocked(planningApi.cancel).mockResolvedValue({
      ...pending,
      status: "cancelled",
    });
    render(
      router(
        <PreferencesProvider>
          <GenerateItineraryPage />
        </PreferencesProvider>,
      ),
    );
    expect(screen.getByText("Loading your travel preferences…")).toBeTruthy();
    await screen.findByDisplayValue("Peanut allergy");
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Step-free access is required",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    await user.click(await screen.findByRole("option", { name: place.label }));
    await user.click(
      screen.getByRole("button", { name: "Make my travel plan" }),
    );
    await screen.findByText("Finding nearby attractions and checking sources.");
    expect(planningApi.start).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        place_id: place.id,
        dietary_needs: "Peanut allergy",
        accessibility: true,
        trip_notes: "Quiet afternoons",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel planning" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Cancel planning" }),
      ).toBeNull(),
    );
    expect(planningApi.cancel).toHaveBeenCalledWith(pending.request_key);
  });
  it("keeps an uncertain request identity for recovery instead of duplicating", async () => {
    const user = userEvent.setup();
    vi.mocked(planningApi.start).mockRejectedValue(
      new Error("Connection lost"),
    );
    render(
      router(
        <PreferencesProvider>
          <GenerateItineraryPage />
        </PreferencesProvider>,
      ),
    );
    await user.click(await screen.findByRole("option", { name: place.label }));
    await user.click(
      screen.getByRole("button", { name: "Make my travel plan" }),
    );
    await screen.findByRole("button", { name: "Check request" });
    const key = vi.mocked(planningApi.start).mock.calls[0][0];
    expect(sessionStorage.getItem("planning_job:1")).toBe(key);
    vi.mocked(planningApi.job).mockResolvedValue({
      ...pending,
      request_key: key,
    });
    await user.click(screen.getByRole("button", { name: "Check request" }));
    await screen.findByRole("button", { name: "Cancel planning" });
    expect(planningApi.start).toHaveBeenCalledOnce();
  });
  it("keeps validation errors readable on the planning page", async () => {
    const user = userEvent.setup();
    vi.mocked(planningApi.start).mockRejectedValue({
      response: {
        data: { detail: [{ msg: "Travelers must include an adult" }] },
        status: 422,
      },
    });
    render(
      router(
        <PreferencesProvider>
          <GenerateItineraryPage />
        </PreferencesProvider>,
      ),
    );
    await user.click(await screen.findByRole("option", { name: place.label }));
    await user.click(
      screen.getByRole("button", { name: "Make my travel plan" }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Travelers must include an adult",
    );
  });
});

describe("saved trip controls", () => {
  it("requests later pages and filters favorites on the server", async () => {
    const user = userEvent.setup();
    vi.mocked(itinerariesApi.page).mockResolvedValue({
      items: [trip],
      total: 55,
      total_all: 55,
      total_favorites: 1,
    });
    render(router(<SavedItinerariesPage />, "/itineraries"));
    await screen.findByText(trip.title);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(itinerariesApi.page).toHaveBeenLastCalledWith(
        expect.objectContaining({ skip: 24, limit: 24 }),
        expect.any(AbortSignal),
      ),
    );
    await user.click(screen.getByRole("button", { name: /Favourites/ }));
    await waitFor(() =>
      expect(itinerariesApi.page).toHaveBeenLastCalledWith(
        expect.objectContaining({ skip: 0, favorites: true }),
        expect.any(AbortSignal),
      ),
    );
  });
  it("can clear a rating and save personal notes", async () => {
    const user = userEvent.setup();
    vi.mocked(itinerariesApi.update).mockResolvedValue(trip);
    render(
      router(
        <Routes>
          <Route path="/itineraries/:id" element={<ItineraryDetailPage />} />
        </Routes>,
        "/itineraries/7",
      ),
    );
    await screen.findByDisplayValue(trip.title);
    await user.selectOptions(screen.getByLabelText("Your rating"), "");
    const notes = screen.getByLabelText("Your notes");
    await user.clear(notes);
    await user.type(notes, "Confirm museum hours");
    await user.click(
      screen.getByRole("button", { name: "Save title, notes and rating" }),
    );
    await waitFor(() =>
      expect(itinerariesApi.update).toHaveBeenCalledWith(7, {
        title: trip.title,
        rating: null,
        user_notes: "Confirm museum hours",
      }),
    );
  });
  it("releases editing controls after cancelling a day regeneration", async () => {
    const user = userEvent.setup();
    vi.mocked(itinerariesApi.regenerateDay).mockResolvedValue({
      ...pending,
      itinerary_id: 7,
    });
    vi.mocked(planningApi.cancel).mockResolvedValue({
      ...pending,
      itinerary_id: 7,
      status: "cancelled",
    });
    render(
      router(
        <Routes>
          <Route path="/itineraries/:id" element={<ItineraryDetailPage />} />
        </Routes>,
        "/itineraries/7",
      ),
    );
    await user.click(
      (await screen.findAllByRole("button", { name: "Replan this day" }))[0],
    );
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(
        (
          screen.getAllByRole("button", {
            name: "Edit day",
          })[0] as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
  });
});

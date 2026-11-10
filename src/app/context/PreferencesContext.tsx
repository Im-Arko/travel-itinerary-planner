import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { preferencesApi, UserPreference } from "../services/api";
import { errorMessage } from "../utils/formatters";

export interface UserPreferences {
  travelStyle: string;
  budget: string;
  tripDuration: number;
  climate: string;
  interests: string[];
  destinationHint: string;
  tripNotes: string;
  destinationType: string;
  dietaryNeeds: string;
  accessibility: boolean;
}
interface PreferencesContextType {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string;
  savePreferences: (prefs: UserPreferences) => void;
  reload: () => void;
}
export const mapPreferences = (pref: UserPreference): UserPreferences => ({
  travelStyle: pref.travel_style,
  budget: pref.budget,
  tripDuration: pref.trip_duration,
  climate: pref.preferred_climate,
  interests: pref.interests,
  destinationType: pref.destination_type,
  dietaryNeeds: pref.dietary_needs || "",
  accessibility: pref.accessibility,
  destinationHint: pref.planning_details?.destinationHint || "",
  tripNotes: pref.planning_details?.tripNotes || "",
});
const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined,
);
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [snapshot, setSnapshot] = useState<{
    id: number;
    data: UserPreferences;
  } | null>(null);
  const [loadedFor, setLoadedFor] = useState<number | null>(null);
  const [failure, setFailure] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const id = user?.id;
  useEffect(() => {
    sessionStorage.removeItem("trip_preferences");
    if (!id) return;
    const controller = new AbortController();
    preferencesApi
      .get(controller.signal)
      .then((pref) => {
        if (controller.signal.aborted) return;
        const data = mapPreferences(pref);
        setSnapshot({ id, data });
        setFailure(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const status = (error as { response?: { status: number } })?.response
          ?.status;
        if (status !== 404 && status !== 401)
          setFailure({
            id,
            message: errorMessage(
              error,
              "Saved preferences could not be loaded. Please retry before using defaults.",
            ),
          });
        else setFailure(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedFor(id);
      });
    return () => controller.abort();
  }, [id, revision]);
  const savePreferences = useCallback(
    (data: UserPreferences) => {
      if (!id) return;
      setSnapshot({ id, data });
    },
    [id],
  );
  const reload = useCallback(() => {
    setLoadedFor(null);
    setRevision((value) => value + 1);
  }, []);
  return (
    <PreferencesContext.Provider
      value={{
        preferences: snapshot && snapshot.id === id ? snapshot.data : null,
        loading: authLoading || Boolean(id && loadedFor !== id),
        error: failure && failure.id === id ? failure.message : "",
        savePreferences,
        reload,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context)
    throw new Error("usePreferences must be used within PreferencesProvider");
  return context;
}

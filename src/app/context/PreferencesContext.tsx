import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

export interface UserPreferences {
  travelStyle: string;
  budget: string;
  tripDuration: number;
  climate: string;
  interests: string[];
  destinationHint: string;
}

interface PreferencesContextType {
  preferences: UserPreferences | null;
  savePreferences: (prefs: UserPreferences) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(() => {
    const stored = sessionStorage.getItem('trip_preferences');
    return stored ? JSON.parse(stored) as UserPreferences : null;
  });

  const savePreferences = useCallback((prefs: UserPreferences) => {
    sessionStorage.setItem('trip_preferences', JSON.stringify(prefs));
    setPreferences(prefs);
  }, []);

  return (
    <PreferencesContext.Provider value={{ preferences, savePreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
}

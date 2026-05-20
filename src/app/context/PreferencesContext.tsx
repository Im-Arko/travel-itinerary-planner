import { createContext, useContext, useState, ReactNode } from 'react';

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

const defaultPreferences: UserPreferences = {
  travelStyle: '',
  budget: '',
  tripDuration: 7,
  climate: '',
  interests: [],
  destinationHint: ''
};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  const savePreferences = (prefs: UserPreferences) => {
    setPreferences(prefs);
  };

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

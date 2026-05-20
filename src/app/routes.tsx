import { createBrowserRouter } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PreferencesPage } from './pages/PreferencesPage';
import { DestinationsPage } from './pages/DestinationsPage';
import { DestinationDetailPage } from './pages/DestinationDetailPage';
import { GenerateItineraryPage } from './pages/GenerateItineraryPage';
import { SavedItinerariesPage } from './pages/SavedItinerariesPage';
import { ItineraryDetailPage } from './pages/ItineraryDetailPage';
import { HomePage } from './pages/HomePage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: 'login', Component: LoginPage },
      { path: 'register', Component: RegisterPage },
      { path: 'preferences', Component: PreferencesPage },
      { path: 'destinations', Component: DestinationsPage },
      { path: 'destinations/:id', Component: DestinationDetailPage },
      { path: 'generate', Component: GenerateItineraryPage },
      { path: 'itineraries', Component: SavedItinerariesPage },
      { path: 'itineraries/:id', Component: ItineraryDetailPage },
    ],
  },
]);

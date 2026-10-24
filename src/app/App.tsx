import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { PreferencesProvider } from './context/PreferencesContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({ typography: { fontFamily: "'Manrope', system-ui, sans-serif" } });

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <PreferencesProvider>
          <RouterProvider router={router} />
        </PreferencesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

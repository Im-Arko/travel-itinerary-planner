import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plane, Map, Wand2, Heart, Settings, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { to: '/destinations', label: 'Destinations', icon: Map },
  { to: '/generate',     label: 'Generate',     icon: Wand2 },
  { to: '/itineraries',  label: 'Saved',         icon: Heart },
  { to: '/preferences',  label: 'Preferences',   icon: Settings },
];

export function RootLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileOpen(false);
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-sand-50 flex flex-col">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-sand-100 shadow-warm-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shadow-warm-sm group-hover:bg-primary-600 transition-colors">
              <Plane className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-serif text-xl font-bold text-sand-800 italic">
              Travel<span className="text-primary-500 not-italic">AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label, icon: Icon }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium font-sans transition-all duration-150 ${
                      active
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-sand-600 hover:bg-sand-100 hover:text-sand-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-primary-500' : ''}`} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Desktop user / auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex flex-col items-end leading-tight">
                  <span className="text-sm font-medium text-sand-800">
                    {user?.full_name || user?.username}
                  </span>
                  <span className="text-xs text-sand-400">@{user?.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-sand-400 hover:text-primary-500 hover:bg-primary-50 transition-all"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-sand-600 hover:text-sand-800 transition-colors px-3 py-2"
                >
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-5">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-sand-600 hover:bg-sand-100 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-sand-100 bg-white px-4 py-3 space-y-1">
            {isAuthenticated ? (
              <>
                {navLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium font-sans transition-all ${
                      isActive(to)
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-sand-600 hover:bg-sand-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </Link>
                ))}
                <div className="pt-2 mt-2 border-t border-sand-100">
                  <div className="px-3 py-2 text-sm">
                    <p className="font-medium text-sand-800">{user?.full_name || user?.username}</p>
                    <p className="text-sand-400 text-xs">@{user?.username}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-sm text-sand-600 hover:bg-sand-100 rounded-xl"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-sm text-center bg-primary-500 text-white rounded-xl font-medium"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* ── Content ── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-sand-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary-400" />
            <span className="font-serif italic text-sand-400 text-sm">TravelAI</span>
          </div>
          <p className="text-xs text-sand-400">
            © {new Date().getFullYear()} TravelAI · Personalized adventures, powered by AI
          </p>
        </div>
      </footer>
    </div>
  );
}
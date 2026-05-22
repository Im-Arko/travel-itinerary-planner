import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plane, Map, Heart, Settings, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function RootLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-surface to-neutral-100">
      {/* Navigation */}
      <nav className="bg-white/85 backdrop-blur-md shadow-warm sticky top-0 z-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <Plane className="w-8 h-8 text-primary group-hover:text-secondary transition-colors" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-serif italic">
                TravelAI
              </span>
            </Link>

            {/* Desktop Navigation */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center gap-6">
                <Link
                  to="/destinations"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/destinations')
                      ? 'bg-primary/10 text-primary'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Map className="w-5 h-5" />
                  <span className="font-medium">Destinations</span>
                </Link>
                <Link
                  to="/generate"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/generate')
                      ? 'bg-primary/10 text-primary'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Plane className="w-5 h-5" />
                  <span className="font-medium">Generate</span>
                </Link>
                <Link
                  to="/itineraries"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/itineraries')
                      ? 'bg-primary/10 text-primary'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Heart className="w-5 h-5" />
                  <span className="font-medium">Saved</span>
                </Link>
                <Link
                  to="/preferences"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive('/preferences')
                      ? 'bg-primary/10 text-primary'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Preferences</span>
                </Link>

                <div className="h-6 w-px bg-neutral-300" />

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral-800">{user?.full_name || user?.username}</p>
                    <p className="text-xs text-neutral-500">@{user?.username}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-neutral-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {!isAuthenticated && (
              <div className="hidden md:flex items-center gap-4">
                <Link
                  to="/login"
                  className="px-4 py-2 text-neutral-700 hover:text-primary transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:from-primary/90 hover:to-secondary/90 transition-all shadow-warm font-medium"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 bg-white">
            <div className="px-4 py-4 space-y-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/destinations"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                      isActive('/destinations') ? 'bg-primary-100 text-primary-700' : 'text-neutral-700'
                    }`}
                  >
                    <Map className="w-5 h-5" />
                    <span>Destinations</span>
                  </Link>
                  <Link
                    to="/generate"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                      isActive('/generate') ? 'bg-primary-100 text-primary-700' : 'text-neutral-700'
                    }`}
                  >
                    <Plane className="w-5 h-5" />
                    <span>Generate Itinerary</span>
                  </Link>
                  <Link
                    to="/itineraries"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                      isActive('/itineraries') ? 'bg-primary-100 text-primary-700' : 'text-neutral-700'
                    }`}
                  >
                    <Heart className="w-5 h-5" />
                    <span>Saved Itineraries</span>
                  </Link>
                  <Link
                    to="/preferences"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                      isActive('/preferences') ? 'bg-primary-100 text-primary-700' : 'text-neutral-700'
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    <span>Preferences</span>
                  </Link>
                  <div className="pt-2 border-t border-neutral-200">
                    <div className="px-3 py-2 text-sm">
                      <p className="font-medium text-neutral-800">{user?.full_name || user?.username}</p>
                      <p className="text-neutral-500">@{user?.username}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-neutral-700 hover:bg-neutral-100 rounded-lg"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 bg-gradient-to-r from-primary-600 to-secondary-700 text-white rounded-lg text-center font-medium"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}

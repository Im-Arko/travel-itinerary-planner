import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Map,
  Compass,
  Heart,
  SlidersHorizontal,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useEffect, useState } from "react";

const navLinks = [
  { to: "/destinations", label: "Destinations", icon: Map },
  { to: "/generate", label: "Plan a trip", icon: Compass },
  { to: "/itineraries", label: "My trips", icon: Heart },
  { to: "/preferences", label: "Travel style", icon: SlidersHorizontal },
];

export function RootLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setMobileOpen(false);
  };
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6F1]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-[#d9ddce] bg-[#fffdf6]/95 backdrop-blur-md">
        <div className="travel-container flex h-[76px] items-center justify-between gap-5">
          <Link
            to="/"
            aria-label="Travellant home"
            className="flex shrink-0 items-center gap-2.5"
          >
            <img
              src="/icons/travellant-mark.svg"
              alt=""
              className="h-10 w-10 object-contain"
            />
            <div>
              <span className="font-script text-[2rem] leading-none text-[#304730]">
                Travellant
              </span>
              <span className="hidden sm:block text-[.5rem] uppercase tracking-[.24em] text-[#7c826e] mt-1">
                A little further from ordinary
              </span>
            </div>
          </Link>
          {isAuthenticated && (
            <nav
              aria-label="Main navigation"
              className="hidden lg:flex items-center gap-1"
            >
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="site-nav-link"
                  aria-current={
                    location.pathname.startsWith(to) ? "page" : undefined
                  }
                >
                  <Icon size={15} />
                  {label}
                </Link>
              ))}
            </nav>
          )}
          <div className="hidden lg:flex items-center gap-5">
            {isAuthenticated ? (
              <>
                <span className="text-xs text-[#68745f] max-w-28 truncate">
                  {user?.full_name || user?.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="icon-button"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-[#42543a]"
                >
                  Sign in
                </Link>
                <Link to="/register" className="travel-button">
                  Start exploring <ArrowUpRight size={16} />
                </Link>
              </>
            )}
          </div>
          <button
            className="icon-button lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileOpen && (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="lg:hidden border-t border-[#d9ddce] px-4 py-4 bg-[#fffdf6]"
          >
            {isAuthenticated ? (
              <>
                {navLinks.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="site-nav-link py-3"
                    aria-current={
                      location.pathname.startsWith(to) ? "page" : undefined
                    }
                  >
                    <Icon size={17} />
                    {label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="site-nav-link w-full py-3"
                >
                  <LogOut size={17} />
                  Sign out
                </button>
              </>
            ) : (
              <div className="flex gap-3">
                <Link
                  to="/login"
                  className="travel-button travel-button-outline flex-1"
                >
                  Sign in
                </Link>
                <Link to="/register" className="travel-button flex-1">
                  Get started
                </Link>
              </div>
            )}
          </nav>
        )}
      </header>
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-[#d8ddcd] bg-[#f0f0e5] py-8">
        <div className="travel-container flex flex-wrap items-center justify-between gap-5">
          <Link to="/" className="font-script text-2xl text-[#3e5335]">
            Travellant
          </Link>
          <p className="text-xs text-[#707a62]">
            A place for your next great story.
          </p>
          <span className="font-stencil text-[.6rem] tracking-[.14em] text-[#7a816d]">
            © {new Date().getFullYear()} TRAVELLANT
          </span>
        </div>
      </footer>
    </div>
  );
}

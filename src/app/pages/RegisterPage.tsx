import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../utils/formatters";
import {
  Mail,
  Lock,
  User,
  UserCircle,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { travelPhotos } from "../components/TravelHero";

export function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await register(email, username, password, fullName);
      navigate("/preferences");
    } catch (err) {
      setError(errorMessage(err, "Registration failed. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="auth-scene">
      <img src={travelPhotos.hills} alt="" />
      <div className="auth-shade" />
      <div className="travel-container auth-layout">
        <div className="auth-editorial">
          <p className="travel-eyebrow text-[#e7dfc8]">
            The first page is yours
          </p>
          <h2>
            Go somewhere
            <br />
            that stays
            <br className="hidden lg:block" /> with you.
          </h2>
          <p className="font-script">Start with a little curiosity.</p>
          <p>
            Find a place that feels right. Make a plan that fits. Keep every
            idea together, from the first daydream to the last day away.
          </p>
        </div>
        <div className="auth-panel">
          <p className="travel-eyebrow text-[#8a7350]">
            Make room for adventure
          </p>
          <h1>Start exploring</h1>
          <p className="form-hint mb-5">
            Your next trip starts with a free account.
          </p>
          <form onSubmit={handleSubmit}>
            {error && (
              <p role="alert" className="travel-error">
                {error}
              </p>
            )}
            <div className="travel-field">
              <label htmlFor="fullName">Full name</label>
              <div className="relative">
                <UserCircle className="auth-input-icon" />
                <input
                  id="fullName"
                  required
                  autoComplete="name"
                  maxLength={100}
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="travel-input"
                />
              </div>
            </div>
            <div className="travel-field">
              <label htmlFor="username">Username</label>
              <div className="relative">
                <User className="auth-input-icon" />
                <input
                  id="username"
                  required
                  autoComplete="username"
                  minLength={3}
                  maxLength={50}
                  pattern="[a-zA-Z0-9_\-]+"
                  title="Use letters, numbers, underscores, and hyphens."
                  placeholder="your_travel_name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="travel-input"
                />
              </div>
            </div>
            <div className="travel-field">
              <label htmlFor="email">Email address</label>
              <div className="relative">
                <Mail className="auth-input-icon" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="travel-input"
                />
              </div>
            </div>
            <div className="travel-field">
              <label htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="auth-input-icon" />
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  placeholder="At least 12 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="travel-input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="auth-password-toggle"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  aria-pressed={showPw}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <p className="form-hint">Use at least 12 characters.</p>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="travel-button"
            >
              {isLoading ? "Creating account…" : "Create account"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-footer">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-bold text-[#355347] underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

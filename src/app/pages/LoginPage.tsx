import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../utils/formatters";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { travelPhotos } from "../components/TravelHero";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      navigate("/destinations");
    } catch (err) {
      setError(errorMessage(err, "Invalid credentials. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="auth-scene">
      <img src={travelPhotos.lake} alt="" />
      <div className="auth-shade" />
      <div className="travel-container auth-layout">
        <div className="auth-editorial">
          <p className="travel-eyebrow text-[#e7dfc8]">Your next chapter</p>
          <h2>
            Good to have
            <br />
            you back.
          </h2>
          <p className="font-script">There's more out there.</p>
          <p>
            The places you've saved. The plans you've made. Pick up where you
            left off and see where the next road takes you.
          </p>
          <div className="mt-12 hidden md:flex items-center gap-4 text-[.65rem] uppercase tracking-[.18em] text-[#f0e9d7]">
            <span className="h-px w-12 bg-[#e0d7ba]" />A little inspiration, a
            lot of possibility
          </div>
        </div>
        <div className="auth-panel">
          <p className="travel-eyebrow text-[#8a7350]">The travel journal</p>
          <h1>Welcome back</h1>
          <p className="form-hint mb-6">
            Sign in to your saved places and travel plans.
          </p>
          <form onSubmit={handleSubmit}>
            {error && (
              <p role="alert" className="travel-error">
                {error}
              </p>
            )}
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
                  autoComplete="current-password"
                  placeholder="Your password"
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
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="travel-button"
            >
              {isLoading ? "Signing in…" : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-footer">
            New here?{" "}
            <Link
              to="/register"
              className="font-bold text-[#355347] underline underline-offset-4"
            >
              Start your travel journal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

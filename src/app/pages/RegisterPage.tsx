import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../utils/formatters';
import { Mail, Lock, User, UserCircle, Plane, Eye, EyeOff } from 'lucide-react';

const BG =
  'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1400&q=80&auto=format&fit=crop';

export function RegisterPage() {
  const [fullName, setFullName]   = useState('');
  const [username, setUsername]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register(email, username, password, fullName);
      navigate('/preferences');
    } catch (err) {
      setError(errorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      {/* ── Left: photo ── */}
      <div className="hidden lg:block relative overflow-hidden">
        <img
          src={BG}
          alt="Travel"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 to-black/55" />
        <div className="absolute top-12 left-12 right-12 text-white">
          <p className="font-serif text-3xl font-semibold italic leading-snug">
            "Not all those who wander are lost."
          </p>
          <p className="font-sans text-sm text-white/55 mt-4">— J.R.R. Tolkien</p>
        </div>
        <div className="absolute bottom-10 left-12 flex items-center gap-2">
          <Plane className="w-5 h-5 text-white/70" />
          <span className="font-serif text-white/70 italic text-lg">TRAVELLANT</span>
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="flex flex-col items-center justify-center px-8 py-16 bg-sand-50">
        <Link to="/" className="flex items-center gap-2 mb-12 group">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center shadow-warm">
            <img
              src="/favicon.png"
              alt="Logo"
              className="w-7 h-7 object-contain"
            />
          </div>
          <span className="font-serif text-2xl font-bold text-sand-800 italic">
            Travellant
          </span>
        </Link>

        <div className="w-full max-w-sm">
          <h1 className="font-serif text-4xl font-bold text-sand-800 mb-2">Start exploring</h1>
          <p className="text-sand-400 font-sans text-sm mb-10">
            Create your account and plan your first AI-powered adventure.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <div>
              <label className="label" htmlFor="fullName">Full name</label>
              <div className="relative">
                <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300 pointer-events-none" />
                <input
                  id="fullName"
                  type="text"
                  required
                  placeholder="Malcolm Todd"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="username">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300 pointer-events-none" />
                <input
                  id="username"
                  type="text"
                  required
                  placeholder="wholesomerockstar"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="email">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-300 pointer-events-none" />
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sand-300 hover:text-sand-500 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-sand-400 mt-1 font-sans">Must be at least 8 characters</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3.5 text-base rounded-xl mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-sand-400 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-500 font-medium hover:text-primary-600 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
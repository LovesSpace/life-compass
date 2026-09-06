import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebase";
import { LeafIcon } from "./icons";

function readableError(code, fallback) {
  const map = {
    "auth/invalid-email": "That doesn't look like an email address.",
    "auth/invalid-credential": "That email and password don't match.",
    "auth/wrong-password": "That email and password don't match.",
    "auth/user-not-found": "No account with that email yet. Create one below.",
    "auth/email-already-in-use": "That email already has an account. Sign in instead.",
    "auth/weak-password": "Use at least six characters.",
    "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
    "auth/network-request-failed": "Couldn't reach the network. Check your connection.",
    "auth/unauthorized-domain": "This address isn't authorised in Firebase yet.",
  };

  return map[code] || fallback || "Something went wrong. Try again.";
}

/*
 * Calming landscape in the sage palette, drawn inline so it needs no asset
 * and matches the rest of the design system.
 */
function Landscape() {
  return (
    <svg
      className="auth-landscape"
      viewBox="0 0 480 220"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMax slice"
    >
      {/* Sky gradient */}
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4e8dc" />
          <stop offset="100%" stopColor="#edf2ee" />
        </linearGradient>
        <linearGradient id="mtn1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7fa98d" />
          <stop offset="100%" stopColor="#9abda7" />
        </linearGradient>
        <linearGradient id="mtn2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5e8e6e" />
          <stop offset="100%" stopColor="#7fa98d" />
        </linearGradient>
        <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fff9e6" />
          <stop offset="100%" stopColor="#f0e6c4" stopOpacity="0.6" />
        </radialGradient>
      </defs>

      <rect width="480" height="220" fill="url(#sky)" />

      {/* Sun / moon */}
      <circle cx="340" cy="60" r="32" fill="url(#sun)" opacity="0.9" />

      {/* Stars */}
      <circle cx="60" cy="30" r="1.2" fill="#fff" opacity="0.5" />
      <circle cx="150" cy="18" r="1" fill="#fff" opacity="0.4" />
      <circle cx="400" cy="25" r="1.1" fill="#fff" opacity="0.45" />
      <circle cx="260" cy="14" r="0.9" fill="#fff" opacity="0.35" />
      <circle cx="420" cy="50" r="1" fill="#fff" opacity="0.3" />
      <circle cx="100" cy="55" r="0.8" fill="#fff" opacity="0.3" />

      {/* Far mountains */}
      <path d="M0 160 L60 90 L120 130 L200 70 L280 120 L360 80 L440 110 L480 95 L480 220 L0 220Z" fill="url(#mtn1)" opacity="0.6" />

      {/* Near mountains */}
      <path d="M0 180 L80 110 L160 150 L240 100 L320 140 L400 105 L480 135 L480 220 L0 220Z" fill="url(#mtn2)" opacity="0.7" />

      {/* Ground */}
      <path d="M0 190 Q120 170 240 185 Q360 200 480 180 L480 220 L0 220Z" fill="#4a6b57" opacity="0.5" />

      {/* Path / river */}
      <path d="M200 220 Q220 190 260 180 Q300 170 340 185 Q380 195 400 220" stroke="#b8d4c2" strokeWidth="3" fill="none" opacity="0.6" />

      {/* Trees — simple triangles */}
      <g fill="#3e6b54" opacity="0.8">
        <polygon points="50,178 58,155 66,178" />
        <polygon points="90,172 100,145 110,172" />
        <polygon points="130,182 138,162 146,182" />
        <polygon points="370,175 378,152 386,175" />
        <polygon points="410,180 420,158 430,180" />
        <polygon points="440,185 447,168 454,185" />
      </g>

      {/* Smaller trees */}
      <g fill="#5e8e6e" opacity="0.6">
        <polygon points="170,188 176,174 182,188" />
        <polygon points="300,183 307,168 314,183" />
        <polygon points="340,188 346,176 352,188" />
        <polygon points="70,185 75,175 80,185" />
      </g>

      {/* Birds */}
      <g stroke="#3e6b54" strokeWidth="1.2" fill="none" opacity="0.4" strokeLinecap="round">
        <path d="M120 60 Q125 55 130 60" />
        <path d="M140 50 Q145 45 150 50" />
        <path d="M280 40 Q285 35 290 40" />
      </g>
    </svg>
  );
}

function Auth({ onAuthenticated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = isSignup
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);

      onAuthenticated(result.user);
    } catch (err) {
      setError(readableError(err.code, err.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <Landscape />

        <div className="auth-body">
          <div className="auth-brand">
            <span className="brand-mark">
              <LeafIcon size={18} />
            </span>
            <span className="brand-name">Life Compass</span>
          </div>

          <h1>{isSignup ? "Create your account" : "Welcome back"}</h1>

          <p className="auth-lede">
            {isSignup
              ? "Start your journaling journey — private, personal, yours."
              : "Your reflections are waiting for you."}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="auth-field-wrap">
              <svg className="auth-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="3.4" />
                <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
              </svg>
              <input
                className="field auth-field"
                type="email"
                placeholder="Email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="auth-field-wrap">
              <svg className="auth-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
                <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
              </svg>
              <input
                className="field auth-field"
                type="password"
                placeholder="Password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>

            <button className="btn auth-btn" type="submit" disabled={loading}>
              {loading
                ? "One moment…"
                : isSignup
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          {error && <p className="notice">{error}</p>}

          <div className="auth-switch">
            <button
              type="button"
              className="btn-bare"
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
              }}
            >
              {isSignup
                ? "I already have an account"
                : "Create an account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
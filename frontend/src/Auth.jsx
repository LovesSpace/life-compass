import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebase";

/*
 * Firebase returns messages like "Firebase: Error (auth/wrong-password)."
 * Users should not have to read those.
 */
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
        <h1>Life Compass</h1>

        <p className="auth-lede">
          A journal that notices what keeps coming back, and remembers only
          what you tell it to.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            className="field"
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <input
            className="field"
            type="password"
            placeholder="Password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />

          <button className="btn" type="submit" disabled={loading}>
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
  );
}

export default Auth;
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Auth from "./Auth";
import Journal from "./Journal";
import Chat from "./Chat";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Auth onAuthenticated={setUser} />;
  }

  return (
    <div>
      <h1>Life Compass</h1>

      <p>Logged in as: {user.email}</p>

      <Journal />
      <Chat />

      <button onClick={() => signOut(auth)}>
        Logout
      </button>
    </div>
  );
}

export default App;

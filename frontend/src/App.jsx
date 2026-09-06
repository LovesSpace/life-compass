import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { getMemories } from "./api";

import Auth from "./Auth";
import Intelligence from "./Intelligence";
import Journal from "./Journal";
import Chat from "./Chat";
import Memories from "./Memories";

import {
  HomeIcon,
  BookIcon,
  ChatIcon,
  MemoryIcon,
  LeafIcon,
  SignOutIcon,
} from "./icons";

/*
 * Journal and Overview read left-aligned, matching the page-to-page
 * heading position. Conversation and Memories are centred instead, since
 * both are a single focal card rather than a left-to-right reading flow.
 */
const WIDTHS = {
  intelligence: "column-center",
  journal: "column-wide",
  chat: "column-talk column-center",
  memories: "column-talk column-center",
};

const VIEWS = [
  { id: "intelligence", label: "Overview", Icon: HomeIcon },
  { id: "journal", label: "Journal", Icon: BookIcon },
  { id: "chat", label: "Conversation", Icon: ChatIcon },
  { id: "memories", label: "Memories", Icon: MemoryIcon },
];

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [view, setView] = useState("intelligence");

  // Memories live here because the rail shows the count and Conversation
  // adds to the list.
  const [memories, setMemories] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);
    });

    return unsubscribe;
  }, []);

  const reloadMemories = useCallback(async () => {
    try {
      const data = await getMemories();
      setMemories(data.memories || []);
    } catch (error) {
      console.error("Could not load memories:", error);
    }
  }, []);

  useEffect(() => {
    if (user) reloadMemories();
  }, [user, reloadMemories]);

  if (checkingAuth) {
    return (
      <div className="auth">
        <p className="empty">Opening your compass…</p>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthenticated={setUser} />;
  }

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <span className="brand-mark">
            <LeafIcon size={20} />
          </span>

          <span>
            <span className="brand-name">Life Compass</span>
            <span className="brand-tag">A calmer you, a brighter tomorrow</span>
          </span>
        </div>

        <nav className="nav">
          {VIEWS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={view === id}
              onClick={() => setView(id)}
            >
              <Icon />
              {label}
              {id === "memories" && memories.length > 0 && (
                <span className="tally">{memories.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="rail-quote">
          <span>
            <LeafIcon size={17} />
          </span>
          <p>Small reflections create a brighter you.</p>
        </div>

        <div className="rail-foot">
          <div className="who-row">
            <span className="avatar">
              {(user.email || "?").charAt(0).toUpperCase()}
            </span>
            <span>{user.email}</span>
          </div>

          <button
            type="button"
            className="sign-out"
            onClick={() => signOut(auth)}
          >
            <SignOutIcon />
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <div className={`column ${WIDTHS[view] || ""}`}>
          {view === "intelligence" && (
            <Intelligence onOpenJournal={() => setView("journal")} />
          )}

          {view === "journal" && <Journal />}

          {view === "chat" && (
            <Chat memories={memories} onMemorySaved={reloadMemories} />
          )}

          {view === "memories" && (
            <Memories memories={memories} onChanged={reloadMemories} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
import { useState } from "react";
import { createMemory, deleteMemory, clearAllMemories } from "./api";
import { formatDate } from "./format";
import {
  MemoryIcon,
  SparkleIcon,
  PersonIcon,
  ShieldIcon,
  PlantBoxIcon,
  PlusIcon,
  ChatIcon,
} from "./icons";

import emptyBoxImg from './assets/empty-box.png'

const FEATURES = [
  {
    Icon: SparkleIcon,
    title: "More relevant conversations",
    body: "Helps the AI understand your context",
  },
  {
    Icon: PersonIcon,
    title: "Your control",
    body: "You choose what to remember",
  },
  {
    Icon: ShieldIcon,
    title: "Private & secure",
    body: "Only you can view your memories",
  },
];

function Memories({ memories, onChanged }) {
  const [content, setContent] = useState("");
  const [reason, setReason] = useState("");
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(event) {
    event.preventDefault();

    if (!content.trim() || saving) return;

    setSaving(true);
    setError("");

    try {
      await createMemory(content, reason, "manual");
      setContent("");
      setReason("");
      setComposing(false);
      await onChanged();
    } catch (err) {
      setError(err.message || "Couldn't save that memory.");
    } finally {
      setSaving(false);
    }
  }

  async function handleForget(memoryId) {
    setError("");

    try {
      await deleteMemory(memoryId);
      await onChanged();
    } catch (err) {
      setError(err.message || "Couldn't remove that memory.");
    }
  }

  async function handleClearAll() {
    setError("");

    try {
      await clearAllMemories();
      setConfirmingClear(false);
      await onChanged();
    } catch (err) {
      setError(err.message || "Couldn't clear your memories.");
    }
  }

  return (
    <>
      <div className="crumb">
        <MemoryIcon />
        Your Memories
      </div>

      <div className="page-head">
        <h1>Your Memories</h1>
        <p className="lede-strong">
          These are the things you&rsquo;ve chosen to remember.
        </p>
        <p>
          Life Compass uses these memories to give you more personalised and
          relevant insights during your conversations. You&rsquo;re always in
          control — you can view or delete them anytime.
        </p>
      </div>

      <div className="feature-row">
        {FEATURES.map(({ Icon, title, body }) => (
          <div className="feature" key={title}>
            <span className="feature-icon">
              <Icon />
            </span>
            <span>
              <strong>{title}</strong>
              <p>{body}</p>
            </span>
          </div>
        ))}
      </div>

      {error && <p className="notice">{error}</p>}

      <div className="card memories-card">
        {memories.length === 0 ? (
          composing ? (
            <form className="composer" onSubmit={handleSave}>
              <div className="card-head">
                <span className="card-head-icon">
                  <MemoryIcon />
                </span>
                <span>
                  <h2>Save a memory</h2>
                  <p>Write it the way you&rsquo;d want it recalled later.</p>
                </span>
              </div>

              <textarea
                className="field"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Something you'd like it to remember"
                rows={3}
                autoFocus
              />

              <input
                className="field"
                type="text"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Why does this matter? (optional)"
                style={{ marginTop: 10 }}
              />

              <div className="composer-actions">
                <button
                  className="btn"
                  type="submit"
                  disabled={saving || !content.trim()}
                >
                  {saving ? "Saving…" : "Remember this"}
                </button>

                <button
                  type="button"
                  className="btn-bare"
                  onClick={() => {
                    setComposing(false);
                    setContent("");
                    setReason("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="memories-empty">
                <img
                  className="empty-box-img"
                  src={emptyBoxImg}
                  alt=""
                  width={160}
                />
              <h2>No memories yet</h2>
              <p>
                When something important comes up in your conversations, you
                can choose to remember it here.
              </p>

              <button
                type="button"
                className="btn"
                onClick={() => setComposing(true)}
              >
                <PlusIcon /> Save a memory manually
              </button>

              <div className="memories-or">or</div>

              <div className="memories-alt">
                <span className="feature-icon">
                  <ChatIcon />
                </span>
                <span>
                  <strong>Start a conversation</strong>
                  <p>
                    Life Compass may suggest memories based on what you
                    share.
                  </p>
                </span>
              </div>
            </div>
          )
        ) : (
          <>
            <form className="composer memories-quick-add" onSubmit={handleSave}>
              <input
                className="field"
                type="text"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Save a memory manually…"
              />

              <button
                className="btn"
                type="submit"
                disabled={saving || !content.trim()}
              >
                <PlusIcon /> {saving ? "Saving…" : "Remember"}
              </button>
            </form>

            {memories.map((memory) => (
              <article className="memory" key={memory.id}>
                <div>
                  <p>{memory.content}</p>
                  <p className="memory-why">
                    {memory.reason} · {formatDate(memory.createdAt)}
                    {memory.source === "chat" && " · from a conversation"}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-bare btn-danger"
                  onClick={() => handleForget(memory.id)}
                >
                  Forget
                </button>
              </article>
            ))}

            <div className="memories-foot">
              {confirmingClear ? (
                <div className="consent-actions">
                  <span className="meta">
                    Remove all {memories.length}? This can&rsquo;t be undone.
                  </span>

                  <button
                    type="button"
                    className="btn-bare btn-danger"
                    onClick={handleClearAll}
                  >
                    Yes, forget everything
                  </button>

                  <button
                    type="button"
                    className="btn-bare"
                    onClick={() => setConfirmingClear(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-bare btn-danger"
                  onClick={() => setConfirmingClear(true)}
                >
                  Forget everything
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <p className="memories-tagline">
        <MemoryIcon /> You decide what&rsquo;s worth remembering.
      </p>
    </>
  );
}

export default Memories;
import { useEffect, useState } from "react";
import {
  createMemory,
  getMemories,
  deleteMemory,
} from "./api";

function Memories() {
  const [memories, setMemories] = useState([]);
  const [content, setContent] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadMemories() {
    try {
      setLoading(true);
      const data = await getMemories();
      setMemories(data.memories);
    } catch (err) {
      setError(err.message || "Failed to load memories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMemories();
  }, []);

  async function handleSave(event) {
    event.preventDefault();

    if (!content.trim() || saving) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      await createMemory(content, reason);

      setContent("");
      setReason("");

      await loadMemories();
    } catch (err) {
      setError(err.message || "Failed to save memory.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(memoryId) {
    try {
      setError("");

      await deleteMemory(memoryId);

      setMemories((previous) =>
        previous.filter((memory) => memory.id !== memoryId)
      );
    } catch (err) {
      setError(err.message || "Failed to delete memory.");
    }
  }

  return (
    <section>
      <h2>My Memories</h2>

      <p>
        You decide what Life Compass is allowed to remember.
      </p>

      <form onSubmit={handleSave}>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="What would you like Life Compass to remember?"
          rows={4}
        />

        <input
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Why should it remember this?"
        />

        <button type="submit" disabled={saving || !content.trim()}>
          {saving ? "Saving..." : "Remember This"}
        </button>
      </form>

      {error && <p>{error}</p>}

      <hr />

      {loading ? (
        <p>Loading memories...</p>
      ) : memories.length === 0 ? (
        <p>You haven't saved any memories yet.</p>
      ) : (
        memories.map((memory) => (
          <div key={memory.id}>
            <p>{memory.content}</p>

            <small>
              Reason: {memory.reason}
            </small>

            <br />

            <button onClick={() => handleDelete(memory.id)}>
              Forget This
            </button>
          </div>
        ))
      )}
    </section>
  );
}

export default Memories;
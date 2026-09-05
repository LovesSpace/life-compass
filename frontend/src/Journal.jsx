import { useEffect, useState } from "react";
import { createJournalEntry, getJournalEntries } from "./api";

function Journal() {
  const [content, setContent] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadEntries = async () => {
    try {
      const data = await getJournalEntries();
      setEntries(data.entries);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createJournalEntry(content);

      setContent("");

      await loadEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>My Journal</h2>

      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={8}
        />

        <br />

        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Reflection"}
        </button>
      </form>

      {error && <p>{error}</p>}

      <h3>Previous Reflections</h3>

      {entries.length === 0 ? (
        <p>No reflections yet.</p>
      ) : (
        entries.map((entry) => (
          <div key={entry.id}>
            <p>{entry.content}</p>
            <hr />
          </div>
        ))
      )}
    </div>
  );
}

export default Journal;

import { useCallback, useEffect, useState } from "react";
import { getJournalIntelligence } from "./api";
import { formatRelative } from "./format";
import { OpenBookIcon, LeafIcon, PencilIcon } from "./icons";

import notebookImg from './assets/notebook.png'

/*
 * The overview screen. Reads as a short letter about the person rather than
 * a dashboard, so the summary carries the most typographic weight and
 * everything else stays quiet beneath it.
 */
function Intelligence({ onOpenJournal }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      setData(await getJournalIntelligence({ refresh }));
    } catch (err) {
      setError(err.message || "Couldn't read your journal just now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  if (loading) {
    return (
      <div className="intel-empty">
        <p className="empty">Reading your recent entries…</p>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <p className="notice">{error}</p>
        <p style={{ marginTop: 16 }}>
          <button type="button" className="btn-bare" onClick={() => load(false)}>
            Try again
          </button>
        </p>
      </>
    );
  }

  const intelligence = data?.intelligence;
  const entriesAnalyzed = data?.entriesAnalyzed ?? 0;

  if (!intelligence || entriesAnalyzed === 0) {
    return (
      <div className="intel-empty">
        <span className="intel-empty-icon">
        <img
          className="intel-empty-img"
          src={notebookImg}
          alt=""
          width={160}
        />
        </span>

        <h1>Nothing to read yet</h1>

        <p>
          Write two or three reflections and this page will start showing
          what keeps coming back.
        </p>

        <button type="button" className="btn" onClick={onOpenJournal}>
          <PencilIcon /> Write your first entry
        </button>

        <div className="encourage">
          <span className="encourage-icon">
            <LeafIcon size={21} />
          </span>

          <div className="encourage-body">
            <strong>Your thoughts matter</strong>
            <p>Capture today, look back with clarity tomorrow.</p>
          </div>
        </div>
      </div>
    );
  }

  const { currentFocus, recurringThemes, progress, summary, reflectionPrompt } =
    intelligence;

  return (
    <>
      <p className="summary">{summary}</p>

      <div className="reading">
        {currentFocus && (
          <section className="block">
            <h2>What you keep coming back to</h2>
            <p>{currentFocus}</p>
          </section>
        )}

        {recurringThemes?.length > 0 && (
          <section className="block">
            <h2>Threads running through your entries</h2>
            <ul className="themes">
              {recurringThemes.map((theme) => (
                <li key={theme}>{theme}</li>
              ))}
            </ul>
          </section>
        )}

        {progress?.length > 0 && (
          <section className="block">
            <h2>What has moved</h2>
            <ul className="observations">
              {progress.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {reflectionPrompt && (
          <section className="block">
            <h2>Something to sit with</h2>
            <p className="prompt">{reflectionPrompt}</p>
          </section>
        )}
      </div>

      <div className="intel-foot">
        <span className="meta">
          Read from {entriesAnalyzed}{" "}
          {entriesAnalyzed === 1 ? "entry" : "entries"}
          {data?.meta?.generatedAt &&
            ` · ${formatRelative(data.meta.generatedAt)}`}
        </span>

        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => load(true)}
          disabled={refreshing}
        >
          {refreshing ? "Reading…" : "Read again"}
        </button>
      </div>
    </>
  );
}

export default Intelligence;
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

/*
 * The emoji dataset is ~390 kB, which is most of the app. Loading it only
 * when the picker is actually opened keeps the first paint fast.
 */
const EmojiPicker = lazy(() => import("emoji-picker-react"));

import DatePicker from "./DatePicker";
import { PencilIcon, SunIcon, SmileIcon, ImageIcon, ArrowIcon, LeafIcon } from "./icons";
import { createJournalEntry, getJournalEntries } from "./api";
import { uploadJournalImage, MAX_IMAGES } from "./storage";
import { toDate } from "./format";

const today = () => new Date().toISOString().slice(0, 10);

// Matches the 10,000-character cap enforced in journalRoutes.js.
const MAX_CHARS = 10000;

/** "YYYY-MM-DD" -> a local Date, avoiding the UTC shift new Date(str) applies. */
function dateFromKey(key) {
  if (!key) return new Date();

  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day);
}

/** The first line becomes the title, the rest becomes the preview. */
function splitEntry(content) {
  const text = (content || "").trim();
  const breakAt = text.indexOf("\n");

  if (breakAt === -1) {
    return { title: text.slice(0, 90), preview: "" };
  }

  return {
    title: text.slice(0, breakAt).slice(0, 90),
    preview: text.slice(breakAt + 1).trim(),
  };
}

/** entryDate is what the person chose; createdAt is when it was written. */
function entryMoment(entry) {
  if (entry.entryDate) return dateFromKey(entry.entryDate);

  return toDate(entry.createdAt) || new Date();
}

function Journal() {
  const [content, setContent] = useState("");
  const [mood, setMood] = useState(null);
  const [entryDate, setEntryDate] = useState(today);
  const [media, setMedia] = useState([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [entries, setEntries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pickerWrap = useRef(null);
  const fileInput = useRef(null);

  async function loadEntries(selectFirst = false) {
    try {
      const data = await getJournalEntries();
      const list = data.entries || [];

      setEntries(list);

      if (selectFirst && list.length) {
        setSelectedId(list[0].id);
      }
    } catch (err) {
      setError(err.message || "Couldn't load your entries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  // Close the emoji picker on an outside click or Escape.
  useEffect(() => {
    if (!pickerOpen) return undefined;

    function onPointerDown(event) {
      if (pickerWrap.current && !pickerWrap.current.contains(event.target)) {
        setPickerOpen(false);
      }
    }

    function onKeyDown(event) {
      if (event.key === "Escape") setPickerOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pickerOpen]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => entryMoment(b) - entryMoment(a)),
    [entries]
  );

  const selected =
    sorted.find((entry) => entry.id === selectedId) || sorted[0] || null;

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);

    event.target.value = "";

    if (!files.length) return;

    const room = MAX_IMAGES - media.length;

    if (room <= 0) {
      setError(`You can attach up to ${MAX_IMAGES} photos to an entry.`);
      return;
    }

    setUploading(true);
    setError("");

    try {
      for (const file of files.slice(0, room)) {
        const uploaded = await uploadJournalImage(file);
        setMedia((previous) => [...previous, uploaded]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!content.trim() || saving) return;

    setSaving(true);
    setError("");

    try {
      await createJournalEntry(content, { mood, entryDate, media });

      setContent("");
      setMood(null);
      setMedia([]);
      setEntryDate(today());

      await loadEntries(true);
    } catch (err) {
      setError(err.message || "Couldn't save that entry.");
    } finally {
      setSaving(false);
    }
  }

  let lastMonth = null;

  return (
    <>
      <div className="today-pill">
        <SunIcon />
        {dateFromKey(entryDate).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
        {entryDate !== today() && (
          <span className="pill-note">writing about this day</span>
        )}
      </div>

      <div className="page-head">
        <h1>Your Journal</h1>
        <p>
          Write freely — A space to reflect, process, and be yourself.
        </p>
      </div>

      <form className="card composer" onSubmit={handleSubmit}>
        <div className="card-head">
          <span className="card-head-icon">
            <PencilIcon />
          </span>

          <span>
            <h2>How are things going today?</h2>
            <p>Start with a thought, a feeling, a win, or whatever is on your mind.</p>
          </span>
        </div>

        <textarea
          className="field"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write freely..."
          maxLength={MAX_CHARS}
          rows={7}
        />

        {media.length > 0 && (
          <div className="thumbs">
            {media.map((item) => (
              <div className="thumb" key={item.path}>
                <img src={item.url} alt={item.name || "Attached photo"} />
                <button
                  type="button"
                  className="thumb-remove"
                  title="Remove photo"
                  onClick={() =>
                    setMedia((previous) =>
                      previous.filter((other) => other.path !== item.path)
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="compose-bar">
          <div className="picker-wrap" ref={pickerWrap}>
            <button
              type="button"
              className={`tool ${mood ? "tool-set" : ""}`}
              onClick={() => setPickerOpen(!pickerOpen)}
              aria-expanded={pickerOpen}
              title={mood ? "Change how the day felt" : "How did the day feel?"}
            >
              {mood || <SmileIcon />}
            </button>

            {pickerOpen && (
              <div className="picker-pop">
                <Suspense
                  fallback={<div className="picker-loading">Loading emoji…</div>}
                >
                  <EmojiPicker
                    onEmojiClick={(data) => {
                      setMood(data.emoji);
                      setPickerOpen(false);
                    }}
                    emojiStyle="native"
                    theme="light"
                    width={340}
                    height={400}
                    searchPlaceholder="Search"
                    previewConfig={{ showPreview: false }}
                    lazyLoadEmojis
                  />
                </Suspense>
              </div>
            )}
          </div>

          <button
            type="button"
            className="tool"
            onClick={() => fileInput.current?.click()}
            disabled={uploading || media.length >= MAX_IMAGES}
            title="Add a photo"
          >
            <ImageIcon />
          </button>

          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            hidden
            onChange={handleFiles}
          />

          <DatePicker value={entryDate} max={today()} onChange={setEntryDate} />

          {uploading && <span className="meta">Uploading…</span>}

          <span className="spacer" />

          <span
            className={`count ${content.length > MAX_CHARS * 0.95 ? "count-warn" : ""}`}
          >
            {content.length}/{MAX_CHARS}
          </span>

          <button
            className="btn"
            type="submit"
            disabled={saving || uploading || !content.trim()}
          >
            <PencilIcon />
            {saving ? "Saving…" : "Save entry"}
            {!saving && <ArrowIcon />}
          </button>
        </div>
      </form>

      <div className="encourage">
        <span className="encourage-icon">
          <LeafIcon size={21} />
        </span>

        <div className="encourage-body">
          <strong>Remember</strong>
          <p>You don't have to have it all figured out. You just have to show up.</p>
        </div>
      </div>

      {error && <p className="notice">{error}</p>}

      {loading ? (
        <p className="empty">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="empty">Your entries will appear here, newest first.</p>
      ) : (
        <div className="journal-split">
          <div className="journal-list">
            {sorted.map((entry) => {
              const moment = entryMoment(entry);
              const { title, preview } = splitEntry(entry.content);
              const cover = entry.media?.[0];

              const month = moment.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              });

              const showMonth = month !== lastMonth;
              lastMonth = month;

              return (
                <div key={entry.id}>
                  {showMonth && <div className="month-rule">{month}</div>}

                  <button
                    type="button"
                    className={`stub ${cover ? "stub-with-cover" : ""}`}
                    aria-current={selected?.id === entry.id}
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <span className="stub-date">
                      <span className="stub-day">
                        {moment
                          .toLocaleDateString(undefined, { weekday: "short" })
                          .toUpperCase()}
                      </span>
                      <br />
                      <span className="stub-num">{moment.getDate()}</span>
                    </span>

                    <span className="stub-text">
                      <span className="stub-title">
                        {entry.mood && <span className="stub-mood">{entry.mood}</span>}
                        {title}
                      </span>
                      {preview && <span className="stub-preview">{preview}</span>}
                    </span>

                    {cover && (
                      <img className="stub-cover" src={cover.url} alt="" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="journal-detail">
            {selected ? (
              <>
                <div className="detail-date">
                  {selected.mood && <span>{selected.mood}</span>}
                  {entryMoment(selected).toLocaleDateString(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>

                <p className="detail-body">{selected.content}</p>

                {selected.media?.length > 0 && (
                  <div className="detail-media">
                    {selected.media.map((item) => (
                      <img
                        key={item.path || item.url}
                        src={item.url}
                        alt={item.name || "Attached photo"}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="detail-empty">
                <p className="empty">Pick an entry to read it.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default Journal;
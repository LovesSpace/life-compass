import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { sendChatMessage, createMemory } from "./api";
import {
  LeafIcon,
  SmileIcon,
  SendIcon,
  LockIcon,
  LockOpenIcon,
  RefreshIcon,
} from "./icons";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

const GREETING =
  "Hi there! 👋\nI'm Life Compass. You can share your thoughts, ask a question, or explore something you're thinking about. What's on your mind?";

const STARTERS = [
  { emoji: "💡", label: "Help me think through something" },
  { emoji: "🌿", label: "I want to reflect on my day" },
  { emoji: "🎯", label: "Give me a fresh perspective" },
  { emoji: "💗", label: "I'm feeling overwhelmed" },
];

function clockTime(date = new Date()) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/*
 * Conversation, with the two consent mechanics the product is built around:
 *
 *   - after a reply the backend may offer something worth remembering.
 *     Nothing is saved unless the person picks Remember.
 *   - private reflection sends isPrivate, which suppresses the offer on the
 *     server side rather than only hiding it here.
 */
function Chat({ memories, onMemorySaved }) {
  const [turns, setTurns] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [openedAt] = useState(() => clockTime());

  const inputRef = useRef(null);
  const pickerWrap = useRef(null);
  const threadEnd = useRef(null);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, suggestion]);

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

  async function send(text) {
    const message = text.trim();

    if (!message || sending) return;

    setError("");
    setSuggestion(null);

    setTurns((previous) => [
      ...previous,
      { role: "user", content: message, at: clockTime() },
    ]);

    setInput("");
    setSending(true);

    try {
      const data = await sendChatMessage(message, conversationId, { isPrivate });

      if (!conversationId) {
        setConversationId(data.conversationId);
      }

      setTurns((previous) => [
        ...previous,
        { role: "assistant", content: data.response, at: clockTime() },
      ]);

      if (data.memorySuggestion) {
        setSuggestion(data.memorySuggestion);
      }
    } catch (err) {
      setError(err.message || "Couldn't send that message.");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    send(input);
  }

  // Enter sends, Shift+Enter starts a new line.
  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  }

  async function handleRemember() {
    if (!suggestion || savingMemory) return;

    setSavingMemory(true);

    try {
      await createMemory(
        suggestion.content,
        suggestion.reason,
        "chat",
        conversationId
      );

      setSuggestion(null);
      await onMemorySaved();
    } catch (err) {
      setError(err.message || "Couldn't save that memory.");
    } finally {
      setSavingMemory(false);
    }
  }

  function startFresh() {
    setTurns([]);
    setConversationId(null);
    setSuggestion(null);
    setError("");
    setInput("");
  }

  return (
    <>
      <div className="page-head">
        <h1>Let&rsquo;s talk</h1>
        <p>
          Share your thoughts, ask questions, and reflect with Life Compass.
          <br />
        </p>
      </div>

      <div className="thread">
        <div className="bubble-row">
          <span className="bubble-avatar">
            <LeafIcon size={18} />
          </span>

          <div>
            <div className="bubble">{GREETING}</div>
            <div className="bubble-time">{openedAt}</div>
          </div>
        </div>

        {turns.map((turn, index) =>
          turn.role === "assistant" ? (
            <div className="bubble-row" key={index}>
              <span className="bubble-avatar">
                <LeafIcon size={18} />
              </span>

              <div>
                <div className="bubble">{turn.content}</div>
                <div className="bubble-time">{turn.at}</div>
              </div>
            </div>
          ) : (
            <div className="bubble-row bubble-row-mine" key={index}>
              <div>
                <div className="bubble bubble-mine">{turn.content}</div>
                <div className="bubble-time">{turn.at}</div>
              </div>
            </div>
          )
        )}

        {sending && (
          <div className="bubble-row">
            <span className="bubble-avatar">
              <LeafIcon size={18} />
            </span>
            <div className="bubble bubble-thinking">Thinking…</div>
          </div>
        )}

        {suggestion && (
          <div className="consent">
            <h3>Remember this?</h3>

            <blockquote>{suggestion.content}</blockquote>

            <div className="consent-actions">
              <button
                type="button"
                className="btn"
                onClick={handleRemember}
                disabled={savingMemory}
              >
                {savingMemory ? "Saving…" : "Remember"}
              </button>

              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => setSuggestion(null)}
              >
                Keep private
              </button>
            </div>
          </div>
        )}

        <div ref={threadEnd} />
      </div>

      {turns.length === 0 && (
        <div className="starters">
          {STARTERS.map((starter) => (
            <button
              key={starter.label}
              type="button"
              className="starter"
              onClick={() => {
                setInput(starter.label);
                inputRef.current?.focus();
              }}
            >
              <span aria-hidden="true">{starter.emoji}</span>
              {starter.label}
            </button>
          ))}
        </div>
      )}

      {error && <p className="notice">{error}</p>}

      <form
        className={`talk-bar ${isPrivate ? "talk-bar-private" : ""}`}
        onSubmit={handleSubmit}
      >
        <button
          type="button"
          className={`talk-lock ${isPrivate ? "talk-lock-on" : ""}`}
          onClick={() => setIsPrivate(!isPrivate)}
          aria-pressed={isPrivate}
          title={
            isPrivate
              ? "Private reflection is on"
              : "Turn on private reflection"
          }
        >
          {isPrivate ? <LockIcon /> : <LockOpenIcon />}
        </button>

        <textarea
          ref={inputRef}
          className="talk-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isPrivate
              ? "Write this one just for yourself…"
              : "Type your message here..."
          }
          rows={1}
          disabled={sending}
        />

        <div className="picker-wrap picker-wrap-up" ref={pickerWrap}>
          <button
            type="button"
            className="talk-icon"
            onClick={() => setPickerOpen(!pickerOpen)}
            aria-expanded={pickerOpen}
            title="Add an emoji"
          >
            <SmileIcon />
          </button>

          {pickerOpen && (
            <div className="picker-pop picker-pop-up picker-pop-right">
              <Suspense
                fallback={<div className="picker-loading">Loading emoji…</div>}
              >
                <EmojiPicker
                  onEmojiClick={(data) => {
                    setInput((previous) => previous + data.emoji);
                    setPickerOpen(false);
                    inputRef.current?.focus();
                  }}
                  emojiStyle="native"
                  theme="light"
                  width={340}
                  height={380}
                  searchPlaceholder="Search"
                  previewConfig={{ showPreview: false }}
                  lazyLoadEmojis
                />
              </Suspense>
            </div>
          )}
        </div>

        <button
          className="talk-send"
          type="submit"
          disabled={sending || !input.trim()}
          title="Send"
        >
          <SendIcon />
        </button>
      </form>

      <p className={`talk-foot ${isPrivate ? "talk-foot-private" : ""}`}>
        <LockIcon />
        {isPrivate
          ? "Private reflection. Nothing from this conversation can become a memory."
          : memories.length > 0
            ? `Drawing on ${memories.length} ${
                memories.length === 1 ? "thing" : "things"
              } you've asked it to remember. Nothing new is remembered unless you choose it.`
            : "Nothing is remembered unless you choose it."}
      </p>

      {turns.length > 0 && (
        <div className="talk-reset">
          <button type="button" className="btn-bare" onClick={startFresh}>
            <RefreshIcon /> Start a new conversation
          </button>
        </div>
      )}
    </>
  );
}

export default Chat;
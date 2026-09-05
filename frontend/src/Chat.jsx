import { useState } from "react";
import { sendChatMessage } from "./api";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend(event) {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) {
      return;
    }

    setError("");

    // Immediately show the user's message.
    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: message,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const data = await sendChatMessage(message, conversationId);

      // The first response creates the conversation.
      if (!conversationId) {
        setConversationId(data.conversationId);
      }

      // Add AI response.
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch (err) {
      console.error(err);

      setError(err.message || "Failed to send message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>Life Compass</h2>

      <p>
        Reflect on your thoughts, goals, and progress.
      </p>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "16px",
          minHeight: "300px",
          marginBottom: "16px",
        }}
      >
        {messages.length === 0 && (
          <p>
            Start a conversation with your Life Compass AI.
          </p>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              marginBottom: "12px",
              textAlign: message.role === "user" ? "right" : "left",
            }}
          >
            <strong>
              {message.role === "user" ? "You" : "Life Compass"}
            </strong>

            <div>{message.content}</div>
          </div>
        ))}

        {loading && (
          <div>
            <strong>Life Compass</strong>
            <div>Thinking...</div>
          </div>
        )}
      </div>

      {error && (
        <p>
          {error}
        </p>
      )}

      <form onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Write a reflection..."
          disabled={loading}
        />

        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}

export default Chat;
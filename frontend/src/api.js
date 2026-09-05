import { auth } from "./firebase";

async function authenticatedRequest(path, options = {}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not authenticated");
  }

  const token = await user.getIdToken();

  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": token,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export async function createJournalEntry(content) {
  return authenticatedRequest("/api/journal", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function getJournalEntries() {
  return authenticatedRequest("/api/journal");
}

export async function sendChatMessage(message, conversationId = null) {
  return authenticatedRequest("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      conversationId,
    }),
  });
}

export async function getConversation(conversationId) {
  return authenticatedRequest(`/api/chat/${conversationId}`);
}
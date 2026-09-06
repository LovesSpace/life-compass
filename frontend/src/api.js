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

export async function createJournalEntry(
  content,
  { mood, entryDate, media } = {}
) {
  return authenticatedRequest("/api/journal", {
    method: "POST",
    body: JSON.stringify({ content, mood, entryDate, media }),
  });
}

export async function getJournalEntries() {
  return authenticatedRequest("/api/journal");
}

export async function sendChatMessage(
  message,
  conversationId = null,
  { isPrivate = false } = {}
) {
  return authenticatedRequest("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      conversationId,
      isPrivate,
    }),
  });
}

export async function getConversation(conversationId) {
  return authenticatedRequest(`/api/chat/${conversationId}`);
}

export async function createMemory(
  content,
  reason,
  source = "manual",
  sourceId = null
) {
  return authenticatedRequest("/api/memories", {
    method: "POST",
    body: JSON.stringify({
      content,
      reason,
      source,
      sourceId,
    }),
  });
}

export async function getMemories() {
  return authenticatedRequest("/api/memories");
}

export async function deleteMemory(memoryId) {
  return authenticatedRequest(`/api/memories/${memoryId}`, {
    method: "DELETE",
  });
}

export async function clearAllMemories() {
  return authenticatedRequest("/api/memories", {
    method: "DELETE",
  });
}

export async function getWhatChanged() {
  return authenticatedRequest("/api/insights/what-changed");
}

export async function getJournalIntelligence({ refresh = false } = {}) {
  const path = refresh
    ? "/api/insights/journal-intelligence?refresh=true"
    : "/api/insights/journal-intelligence";

  return authenticatedRequest(path);
}
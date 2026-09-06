const { getFirestore } = require("firebase-admin/firestore");

/*
 * Assembles the context Gemini sees for a chat turn.
 *
 * Three sources, all scoped to the authenticated UID:
 *   - memories the user explicitly chose to save
 *   - a small slice of recent journal entries
 *   - the earlier turns of this conversation
 *
 * Nothing here writes. Memory creation only ever happens when the user
 * accepts a suggestion, through the existing POST /api/memories route.
 */

const LIMITS = {
  maxMemories: 25,
  maxMemoryChars: 3000,

  maxJournalEntries: 5,
  maxJournalChars: 2500,

  maxHistoryMessages: 10,
  maxHistoryChars: 4000,

  maxSuggestionChars: 200,
};

function userDoc(uid) {
  return getFirestore().collection("users").doc(uid);
}

/**
 * The user's saved memories, newest first, bounded by count and characters.
 */
async function fetchMemories(uid) {
  const snapshot = await userDoc(uid)
    .collection("memories")
    .orderBy("createdAt", "desc")
    .limit(LIMITS.maxMemories)
    .get();

  const memories = [];
  let totalChars = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const content = typeof data.content === "string" ? data.content.trim() : "";

    if (!content) continue;
    if (totalChars + content.length > LIMITS.maxMemoryChars) break;

    totalChars += content.length;

    memories.push({
      id: doc.id,
      content,
      reason: typeof data.reason === "string" ? data.reason : null,
    });
  }

  return memories;
}

/**
 * Recent journal entries, for background the user did not explicitly save
 * as a memory but which still describes their situation.
 */
async function fetchRecentJournal(uid) {
  const snapshot = await userDoc(uid)
    .collection("journalEntries")
    .orderBy("createdAt", "desc")
    .limit(LIMITS.maxJournalEntries)
    .get();

  const entries = [];
  let totalChars = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const content = typeof data.content === "string" ? data.content.trim() : "";

    if (!content) continue;
    if (entries.length > 0 && totalChars + content.length > LIMITS.maxJournalChars) {
      break;
    }

    totalChars += content.length;
    entries.push(content);
  }

  return entries;
}

/**
 * Earlier turns of this specific conversation, oldest first.
 *
 * Read from the tail of the conversation so long threads keep their most
 * recent context rather than their opening messages.
 */
async function fetchHistory(uid, conversationId) {
  if (!conversationId) return [];

  const snapshot = await userDoc(uid)
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("createdAt", "desc")
    .limit(LIMITS.maxHistoryMessages)
    .get();

  const messages = [];
  let totalChars = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const content = typeof data.content === "string" ? data.content.trim() : "";
    const role = data.role === "assistant" ? "assistant" : "user";

    if (!content) continue;
    if (totalChars + content.length > LIMITS.maxHistoryChars) break;

    totalChars += content.length;
    messages.push({ role, content });
  }

  // Read newest-first for the budget, hand back oldest-first for the prompt.
  return messages.reverse();
}

/**
 * Turn the gathered context into a single prompt string.
 */
function buildPrompt({ memories, journalEntries, history, message, isPrivate }) {
  const sections = [];

  sections.push(
    "You are Life Compass, a reflective journaling companion. " +
      "You help the person think clearly about their own life using what they have written. " +
      "Be warm, concrete and brief. Ask at most one question. " +
      "Never diagnose, and never give medical or psychological judgments. " +
      "If they appear to be in real distress, gently encourage them to talk to someone they trust."
  );

  if (memories.length) {
    const lines = memories.map((memory) => `- ${memory.content}`).join("\n");

    sections.push(
      `Things this person explicitly asked you to remember:\n${lines}\n\n` +
        "Use these naturally when they are relevant. Do not list them back."
    );
  }

  if (journalEntries.length) {
    const lines = journalEntries
      .map((entry, index) => `[${index + 1}] ${entry}`)
      .join("\n\n");

    sections.push(
      `Recent journal entries, newest first (background only):\n${lines}`
    );
  }

  if (history.length) {
    const lines = history
      .map((msg) => `${msg.role === "assistant" ? "Life Compass" : "Person"}: ${msg.content}`)
      .join("\n");

    sections.push(`Earlier in this conversation:\n${lines}`);
  }

  if (isPrivate) {
    sections.push(
      "This is a private reflection. Nothing said here will be saved as a long-term memory. " +
        "Do not suggest remembering anything."
    );
  }

  sections.push(`Person: ${message}\n\nLife Compass:`);

  return sections.join("\n\n---\n\n");
}

const FIRST_PERSON = /\b(i'm|i am|i've|i have|my|i want|i started|i'm building|i plan|i decided|working on)\b/i;

/**
 * Propose something worth remembering from the user's message.
 *
 * Deliberately conservative and heuristic. It never saves anything - it only
 * offers a candidate the user can accept or ignore. Returning null is a
 * perfectly good outcome and the common one.
 *
 * When Gemini is switched on this can be replaced by asking the model,
 * keeping the same {content, reason} shape.
 */
function suggestMemory(message, existingMemories = []) {
  const trimmed = message.trim();

  if (trimmed.length < 25) return null;
  if (trimmed.endsWith("?")) return null;
  if (!FIRST_PERSON.test(trimmed)) return null;

  // First sentence, or the opening of a long single-sentence message.
  const firstSentence = trimmed.split(/(?<=[.!?])\s+/)[0] || trimmed;

  const candidate = firstSentence.slice(0, LIMITS.maxSuggestionChars).trim();

  if (candidate.length < 20) return null;

  // Don't re-offer something close to what is already saved.
  const normalised = candidate.toLowerCase();

  const duplicate = existingMemories.some((memory) => {
    const other = memory.content.toLowerCase();
    return other.includes(normalised) || normalised.includes(other);
  });

  if (duplicate) return null;

  return {
    content: candidate,
    reason: "You mentioned this about yourself in conversation.",
  };
}

/**
 * One call that gathers everything a chat turn needs.
 */
async function buildChatContext(uid, { message, conversationId, isPrivate }) {
  const [memories, journalEntries, history] = await Promise.all([
    fetchMemories(uid),
    fetchRecentJournal(uid),
    fetchHistory(uid, conversationId),
  ]);

  const prompt = buildPrompt({
    memories,
    journalEntries,
    history,
    message,
    isPrivate,
  });

  return {
    prompt,
    memories,
    memorySuggestion: isPrivate ? null : suggestMemory(message, memories),
    stats: {
      memoriesUsed: memories.length,
      journalEntriesUsed: journalEntries.length,
      historyMessagesUsed: history.length,
    },
  };
}

module.exports = {
  LIMITS,
  fetchMemories,
  fetchRecentJournal,
  fetchHistory,
  buildPrompt,
  suggestMemory,
  buildChatContext,
};
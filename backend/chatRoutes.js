const express = require("express");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { authenticateUser } = require("./authMiddleware");
const { buildChatContext } = require("./chatContext");
const { generateGeminiResponse } = require("./geminiService");

const router = express.Router();
const db = getFirestore();

/*
 * Send a message in a conversation.
 *
 * Body:
 *   message         string   required
 *   conversationId  string   optional - omit to start a new conversation
 *   isPrivate       boolean  optional - private reflection mode
 *
 * Private reflection still stores the conversation so the thread works
 * across turns, but it is flagged private, produces no memory suggestion,
 * and can never become a long-term memory.
 */
router.post("/", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { conversationId, message, isPrivate } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return res.status(400).json({
        error: "Message cannot be empty",
      });
    }

    if (trimmedMessage.length > 5000) {
      return res.status(400).json({
        error: "Message is too long",
      });
    }

    const privateMode = isPrivate === true;

    const conversationRef = conversationId
      ? db.collection("users").doc(uid).collection("conversations").doc(conversationId)
      : db.collection("users").doc(uid).collection("conversations").doc();

    const finalConversationId = conversationRef.id;

    /*
     * Gather the user's memories, recent journal entries and the earlier
     * turns of this conversation, then build the prompt. Everything is
     * scoped to this UID - no other user's data can reach the model.
     */
    const context = await buildChatContext(uid, {
      message: trimmedMessage,
      conversationId,
      isPrivate: privateMode,
    });

    /*
     * generateGeminiResponse returns a canned reply while
     * USE_REAL_GEMINI is unset, so this path costs nothing in development.
     */
    const aiResponse = await generateGeminiResponse(context.prompt, {
      fallback:
        "I couldn't reach my reasoning service just now, but your message has been saved. Try again in a moment.",
    });

    // Store the user's message
    await conversationRef.collection("messages").doc().set({
      role: "user",
      content: trimmedMessage,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Store the AI response
    await conversationRef.collection("messages").doc().set({
      role: "assistant",
      content: aiResponse,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Conversation metadata. isPrivate is sticky once set.
    await conversationRef.set(
      {
        updatedAt: FieldValue.serverTimestamp(),
        lastMessage: trimmedMessage,
        ...(privateMode ? { isPrivate: true } : {}),
      },
      { merge: true }
    );

    res.status(200).json({
      conversationId: finalConversationId,
      response: aiResponse,
      isPrivate: privateMode,

      /*
       * A candidate the user may choose to remember. The backend never
       * saves it - the frontend posts it to /api/memories only if the
       * user taps Remember. Null in private mode, and null whenever
       * nothing in the message looked worth offering.
       */
      memorySuggestion: context.memorySuggestion,

      contextUsed: context.stats,
    });
  } catch (error) {
    console.error("Chat error:", error);

    res.status(500).json({
      error: "Failed to process chat message",
    });
  }
});

/*
 * Get messages from the authenticated user's conversation
 */
router.get("/:conversationId", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { conversationId } = req.params;

    const conversationRef = db
      .collection("users")
      .doc(uid)
      .collection("conversations")
      .doc(conversationId);

    const [conversationDoc, snapshot] = await Promise.all([
      conversationRef.get(),
      conversationRef.collection("messages").orderBy("createdAt", "asc").limit(100).get(),
    ]);

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      conversationId,
      isPrivate: conversationDoc.exists && conversationDoc.data().isPrivate === true,
      messages,
    });
  } catch (error) {
    console.error("Get chat error:", error);

    res.status(500).json({
      error: "Failed to retrieve conversation",
    });
  }
});

module.exports = router;
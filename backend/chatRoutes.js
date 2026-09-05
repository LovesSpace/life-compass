const express = require("express");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { authenticateUser } = require("./authMiddleware");

const router = express.Router();
const db = getFirestore();

/*
 * Send a message in a conversation
 */
router.post("/", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { conversationId, message } = req.body;

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

    // Create a conversation ID if this is a new conversation
    const conversationRef = conversationId
      ? db
          .collection("users")
          .doc(uid)
          .collection("conversations")
          .doc(conversationId)
      : db
          .collection("users")
          .doc(uid)
          .collection("conversations")
          .doc();

    const finalConversationId = conversationRef.id;

    // Store the user's message
    await conversationRef
      .collection("messages")
      .doc()
      .set({
        role: "user",
        content: trimmedMessage,
        createdAt: FieldValue.serverTimestamp(),
      });

    /*
     * Development mode:
     * Return a dummy AI response so we don't consume Gemini quota.
     */
    const aiResponse =
      "I'm your Life Compass AI. I received your reflection and I'm ready to help you explore it.";

    // Store the AI response
    await conversationRef
      .collection("messages")
      .doc()
      .set({
        role: "assistant",
        content: aiResponse,
        createdAt: FieldValue.serverTimestamp(),
      });

    // Update conversation metadata
    await conversationRef.set(
      {
        updatedAt: FieldValue.serverTimestamp(),
        lastMessage: trimmedMessage,
      },
      { merge: true }
    );

    res.status(200).json({
      conversationId: finalConversationId,
      response: aiResponse,
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

    const snapshot = await conversationRef
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limit(100)
      .get();

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      conversationId,
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

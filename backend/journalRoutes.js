const express = require("express");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { authenticateUser } = require("./authMiddleware");

const router = express.Router();
const db = getFirestore();

/*
 * Create a new journal entry
 */
router.post(["/", ""], authenticateUser, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { content } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({
        error: "Journal content is required",
      });
    }

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return res.status(400).json({
        error: "Journal content cannot be empty",
      });
    }

    if (trimmedContent.length > 10000) {
      return res.status(400).json({
        error: "Journal entry is too long",
      });
    }

    const entryRef = db
      .collection("users")
      .doc(uid)
      .collection("journalEntries")
      .doc();

    await entryRef.set({
      content: trimmedContent,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      id: entryRef.id,
      content: trimmedContent,
    });
  } catch (error) {
    console.error("Create journal error:", error);

    res.status(500).json({
      error: "Failed to create journal entry",
    });
  }
});

/*
 * Get the authenticated user's journal entries
 */
router.get(["/", ""], authenticateUser, async (req, res) => {
  try {
    const uid = req.user.uid;

    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("journalEntries")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const entries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      entries,
    });
  } catch (error) {
    console.error("Get journal error:", error);

    res.status(500).json({
      error: "Failed to retrieve journal entries",
    });
  }
});

module.exports = router;
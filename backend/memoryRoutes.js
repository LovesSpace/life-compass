const express = require("express");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { authenticateUser } = require("./authMiddleware");

const router = express.Router();
const db = getFirestore();

// Create a memory
router.post("/", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { content, reason, source, sourceId } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({
        error: "Memory content is required",
      });
    }

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return res.status(400).json({
        error: "Memory content cannot be empty",
      });
    }

    if (trimmedContent.length > 2000) {
      return res.status(400).json({
        error: "Memory is too long",
      });
    }

    const validSources = ["chat", "journal", "manual"];

    const memorySource = validSources.includes(source)
      ? source
      : "manual";

    const memoryRef = db
      .collection("users")
      .doc(uid)
      .collection("memories")
      .doc();

    await memoryRef.set({
      content: trimmedContent,

      reason:
        typeof reason === "string" && reason.trim()
          ? reason.trim()
          : "Saved by user",

      source: memorySource,

      sourceId:
        typeof sourceId === "string" && sourceId.trim()
          ? sourceId.trim()
          : null,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      id: memoryRef.id,
      content: trimmedContent,
      reason:
        typeof reason === "string" && reason.trim()
          ? reason.trim()
          : "Saved by user",
      source: memorySource,
      sourceId:
        typeof sourceId === "string" && sourceId.trim()
          ? sourceId.trim()
          : null,
    });
  } catch (error) {
    console.error("Create memory error:", error);

    res.status(500).json({
      error: "Failed to save memory",
    });
  }
});

// Get user's memories
router.get("/", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.uid;

    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("memories")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const memories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      memories,
    });
  } catch (error) {
    console.error("Get memories error:", error);

    res.status(500).json({
      error: "Failed to retrieve memories",
    });
  }
});

// Delete every memory for this user
router.delete("/", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.uid;

    const collectionRef = db
      .collection("users")
      .doc(uid)
      .collection("memories");

    let deleted = 0;

    // Delete in batches so a large collection does not blow the 500-write
    // limit on a single batch.
    for (;;) {
      const snapshot = await collectionRef.limit(400).get();

      if (snapshot.empty) break;

      const batch = db.batch();

      snapshot.docs.forEach((doc) => batch.delete(doc.ref));

      await batch.commit();

      deleted += snapshot.size;
    }

    res.json({
      deleted,
    });
  } catch (error) {
    console.error("Clear memories error:", error);

    res.status(500).json({
      error: "Failed to clear memories",
    });
  }
});

// Delete a memory
router.delete("/:memoryId", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { memoryId } = req.params;

    const memoryRef = db
      .collection("users")
      .doc(uid)
      .collection("memories")
      .doc(memoryId);

    await memoryRef.delete();

    res.status(204).send();
  } catch (error) {
    console.error("Delete memory error:", error);

    res.status(500).json({
      error: "Failed to delete memory",
    });
  }
});

module.exports = router;
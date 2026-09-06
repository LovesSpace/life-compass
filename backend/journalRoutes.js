const express = require("express");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { authenticateUser } = require("./authMiddleware");

const router = express.Router();
const db = getFirestore();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/*
 * Any single emoji is allowed, but it must actually be one. The length cap
 * covers ZWJ sequences (family, flags, skin tones) while stopping someone
 * storing a paragraph in the mood field.
 */
const EMOJI_PATTERN = /^\p{Extended_Pictographic}[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{200D}\u{FE0F}\u{E0020}-\u{E007F}]*$/u;

const MAX_MEDIA = 6;

/*
 * Media is uploaded straight to Firebase Storage by the client, which is
 * why only the resulting reference reaches us. We still validate it rather
 * than trusting whatever the client posts.
 */
function sanitiseMedia(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item) =>
        item &&
        typeof item.url === "string" &&
        item.url.startsWith("https://") &&
        item.url.length < 2000
    )
    .slice(0, MAX_MEDIA)
    .map((item) => ({
      url: item.url,
      path: typeof item.path === "string" ? item.path.slice(0, 500) : null,
      name: typeof item.name === "string" ? item.name.slice(0, 120) : null,
    }));
}

/*
 * Create a new journal entry
 */
router.post(["/", ""], authenticateUser, async (req, res) => {
  try {
    const uid = req.user.uid;
    const { content, mood, entryDate, media } = req.body;

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

    // Optional mood. Anything that is not a single emoji is dropped.
    const safeMood =
      typeof mood === "string" && mood.length <= 24 && EMOJI_PATTERN.test(mood)
        ? mood
        : null;

    const safeMedia = sanitiseMedia(media);

    /*
     * The date the entry is *about*, which the client prefills with today but
     * the person can change to backdate. createdAt stays the write time.
     */
    const safeEntryDate =
      typeof entryDate === "string" && DATE_PATTERN.test(entryDate)
        ? entryDate
        : new Date().toISOString().slice(0, 10);

    const entryRef = db
      .collection("users")
      .doc(uid)
      .collection("journalEntries")
      .doc();

    await entryRef.set({
      content: trimmedContent,
      mood: safeMood,
      media: safeMedia,
      entryDate: safeEntryDate,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.status(201).json({
      id: entryRef.id,
      content: trimmedContent,
      mood: safeMood,
      media: safeMedia,
      entryDate: safeEntryDate,
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
const express = require("express");
const { getFirestore } = require("firebase-admin/firestore");
const { authenticateUser } = require("./authMiddleware");
const { getJournalIntelligence } = require("./journalIntelligence");

const router = express.Router();
const db = getFirestore();

/*
 * Journal Intelligence
 *
 * Structured analysis of the user's recent journal entries.
 * Cached in Firestore and keyed by a fingerprint of the entries, so
 * repeated page loads never re-run the analysis.
 *
 * Pass ?refresh=true to bypass the cache.
 */
router.get("/journal-intelligence", authenticateUser, async (req, res) => {
  try {
    const result = await getJournalIntelligence(req.user.uid, {
      forceRefresh: req.query.refresh === "true",
    });

    res.json({
      status: "ok",
      intelligence: result.intelligence,
      entriesAnalyzed: result.entriesAnalyzed,
      meta: {
        generatedAt: result.generatedAt
          ? result.generatedAt.toISOString()
          : null,
        fromCache: result.fromCache,
        analyzer: result.analyzer,
      },
    });
  } catch (error) {
    console.error("Journal intelligence error:", error);

    res.status(500).json({
      error: "Failed to generate journal intelligence",
    });
  }
});

router.get("/what-changed", authenticateUser, async (req, res) => {
  try {
    const uid = req.user.uid;

    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("journalEntries")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const entries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Not enough data for a meaningful comparison yet.
    if (entries.length < 2) {
      return res.json({
        status: "insufficient_data",
        message:
          "Write at least two journal entries to discover how your thoughts are changing.",
        entriesAnalyzed: entries.length,
      });
    }

    /*
     * Development response.
     *
     * We deliberately don't call Gemini here yet.
     * Later this section will analyze the user's journal entries
     * and generate a real longitudinal insight.
     */
    const insight = {
      summary:
        "Your reflections are beginning to form a pattern. Keep journaling to make changes in your focus and priorities clearer.",
      changes: [
        {
          area: "Reflection",
          before: entries[entries.length - 1].content,
          now: entries[0].content,
        },
      ],
      entriesAnalyzed: entries.length,
    };

    res.json({
      status: "ok",
      insight,
    });
  } catch (error) {
    console.error("What Changed error:", error);

    res.status(500).json({
      error: "Failed to generate What Changed insight",
    });
  }
});

module.exports = router;
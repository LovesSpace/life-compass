const { getFirestore } = require("firebase-admin/firestore");

const {
  toDate,
  fingerprintDocuments,
  withInsightCache,
} = require("../insightCache");

const {
  SCHEMA_VERSION,
  LIMITS,
  CACHE_MAX_AGE_MS,
  validateIntelligence,
} = require("./schema");

const dummyAnalyzer = require("./dummyAnalyzer");

const CACHE_DOC_ID = "journalIntelligence";

/**
 * Which analyzer runs. Same flag geminiService already uses, so development
 * mode stays free and a single env var flips the whole pipeline.
 */
function selectAnalyzer() {
  if (process.env.USE_REAL_GEMINI === "true") {
    return require("./geminiAnalyzer");
  }

  return dummyAnalyzer;
}

/**
 * Read the analysis window: newest entries, bounded by both count and
 * total characters.
 */
async function fetchEntries(uid) {
  const snapshot = await getFirestore()
    .collection("users")
    .doc(uid)
    .collection("journalEntries")
    .orderBy("createdAt", "desc")
    .limit(LIMITS.maxEntries)
    .get();

  const entries = [];
  let totalChars = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const content = typeof data.content === "string" ? data.content.trim() : "";

    if (!content) continue;

    // Always take at least one entry, then stop at the character budget.
    if (entries.length > 0 && totalChars + content.length > LIMITS.maxTotalChars) {
      break;
    }

    totalChars += content.length;

    entries.push({
      id: doc.id,
      content,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    });
  }

  return entries;
}

/**
 * Run the analyzer, validate its output, fall back to the deterministic
 * analyzer if anything went wrong. Never returns an unvalidated payload,
 * which is what keeps malformed model output out of the cache.
 */
async function runAnalysis(analyzer, entries) {
  let intelligence = null;

  try {
    intelligence = validateIntelligence(await analyzer.analyze(entries));
  } catch (error) {
    console.error(`Analyzer ${analyzer.name} failed:`, error.message);
  }

  if (!intelligence && analyzer !== dummyAnalyzer) {
    console.warn(`Falling back to ${dummyAnalyzer.name}`);
    intelligence = validateIntelligence(await dummyAnalyzer.analyze(entries));
  }

  if (!intelligence) {
    throw new Error("Analysis produced no usable result");
  }

  return intelligence;
}

async function getJournalIntelligence(uid, { forceRefresh = false } = {}) {
  const analyzer = selectAnalyzer();
  const entries = await fetchEntries(uid);

  const fingerprint = fingerprintDocuments(entries, {
    schemaVersion: SCHEMA_VERSION,
    analyzer: analyzer.name,
    maxEntries: LIMITS.maxEntries,
    maxTotalChars: LIMITS.maxTotalChars,
  });

  const result = await withInsightCache(
    uid,
    CACHE_DOC_ID,
    {
      fingerprint,
      maxAgeMs: CACHE_MAX_AGE_MS,
      forceRefresh,
      meta: {
        schemaVersion: SCHEMA_VERSION,
        analyzer: analyzer.name,
        entriesAnalyzed: entries.length,
      },
    },
    () => runAnalysis(analyzer, entries)
  );

  return {
    intelligence: result.payload,
    entriesAnalyzed: result.meta.entriesAnalyzed ?? entries.length,
    analyzer: result.meta.analyzer || analyzer.name,
    generatedAt: result.generatedAt,
    fromCache: result.fromCache,
  };
}

module.exports = {
  getJournalIntelligence,
  CACHE_DOC_ID,
};
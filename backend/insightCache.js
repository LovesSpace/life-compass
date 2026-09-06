const crypto = require("crypto");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

/*
 * Generic caching layer for generated insights.
 *
 * Every cached insight lives at:
 *   users/{uid}/insights/{docId}
 *
 * A cache entry is only reused when its stored fingerprint matches the
 * fingerprint of the data it was generated from. Anything that changes the
 * inputs - a new entry, an edited entry, a deleted entry, a different
 * analyzer, a new schema version - changes the fingerprint and forces a
 * recompute. That is what keeps us off the Gemini quota on page reloads.
 */

const CACHE_COLLECTION = "insights";

/**
 * Firestore Timestamp -> JS Date. Returns null while a serverTimestamp()
 * write is still pending.
 */
function toDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp.toDate === "function") return timestamp.toDate();
  return null;
}

/**
 * Builds a stable hash over the documents an insight was derived from.
 *
 * `context` carries anything outside the documents that should also
 * invalidate the cache - schema version, analyzer name, window size.
 */
function fingerprintDocuments(documents, context = {}) {
  const hash = crypto.createHash("sha256");

  const contextKeys = Object.keys(context).sort();
  for (const key of contextKeys) {
    hash.update(`${key}=${String(context[key])};`);
  }
  hash.update("|");

  for (const doc of documents) {
    // A pending serverTimestamp hashes as "pending", so the next read -
    // once the timestamp has resolved - deliberately misses and recomputes.
    const stamp = doc.updatedAt ? doc.updatedAt.getTime() : "pending";
    hash.update(`${doc.id}@${stamp};`);
  }

  return hash.digest("hex");
}

function cacheRef(uid, docId) {
  return getFirestore()
    .collection("users")
    .doc(uid)
    .collection(CACHE_COLLECTION)
    .doc(docId);
}

/**
 * Read a cache entry, but only return it if it is still valid.
 *
 * @param {object} options
 * @param {string} options.fingerprint - the fingerprint the caller expects
 * @param {number} [options.maxAgeMs] - optional TTL on top of the fingerprint
 */
async function readCache(uid, docId, { fingerprint, maxAgeMs } = {}) {
  const snapshot = await cacheRef(uid, docId).get();

  if (!snapshot.exists) return null;

  const data = snapshot.data();

  if (!data || !data.payload) return null;
  if (data.fingerprint !== fingerprint) return null;

  const generatedAt = toDate(data.generatedAt);

  if (maxAgeMs && generatedAt) {
    if (Date.now() - generatedAt.getTime() > maxAgeMs) return null;
  }

  return {
    payload: data.payload,
    meta: data.meta || {},
    generatedAt,
  };
}

async function writeCache(uid, docId, { fingerprint, payload, meta = {} }) {
  await cacheRef(uid, docId).set({
    fingerprint,
    payload,
    meta,
    generatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * The main entry point: read-through cache.
 *
 * `produce()` is only invoked on a miss. Its result is validated by the
 * caller before it ever reaches here, so we never cache a malformed payload.
 *
 * A cache write failure is logged and swallowed - a working response the
 * user can see beats a 500 because a cache doc could not be persisted.
 */
async function withInsightCache(
  uid,
  docId,
  { fingerprint, maxAgeMs, forceRefresh = false, meta = {} },
  produce
) {
  if (!forceRefresh) {
    const cached = await readCache(uid, docId, { fingerprint, maxAgeMs });

    if (cached) {
      return {
        payload: cached.payload,
        meta: cached.meta,
        generatedAt: cached.generatedAt,
        fromCache: true,
      };
    }
  }

  const payload = await produce();

  try {
    await writeCache(uid, docId, { fingerprint, payload, meta });
  } catch (error) {
    console.error(`Insight cache write failed for ${docId}:`, error.message);
  }

  return {
    payload,
    meta,
    generatedAt: new Date(),
    fromCache: false,
  };
}

/**
 * Drop a cached insight. Useful when the user explicitly asks to reset,
 * or when a background job invalidates everything after a schema change.
 */
async function clearCache(uid, docId) {
  await cacheRef(uid, docId).delete();
}

module.exports = {
  toDate,
  fingerprintDocuments,
  readCache,
  writeCache,
  withInsightCache,
  clearCache,
};
/*
 * The contract for the journal-intelligence payload.
 *
 * SCHEMA_VERSION is part of the cache fingerprint. Bump it whenever the
 * shape of `intelligence` changes, and every cached document is
 * automatically invalidated on the next request.
 */

const SCHEMA_VERSION = 1;

const LIMITS = {
  // Two independent bounds on the analysis window. Entry count alone does
  // not bound token cost, because one entry can be 10,000 characters.
  maxEntries: 25,
  maxTotalChars: 20000,

  maxThemes: 5,
  maxProgress: 4,
  maxFieldChars: 400,
};

// Even when nothing has changed, refresh once a day so the output does not
// feel frozen. Set to null to rely on the fingerprint alone.
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function clampString(value, max = LIMITS.maxFieldChars) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed) return null;

  return trimmed.slice(0, max);
}

function clampStringArray(value, maxItems) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => clampString(item))
    .filter(Boolean)
    .slice(0, maxItems);
}

/**
 * Coerce analyzer output into a known-good shape.
 *
 * Returns null when the result is unusable, so the caller can fall back to
 * the deterministic analyzer instead of caching garbage. This is the guard
 * that matters most once Gemini is generating the JSON.
 */
function validateIntelligence(raw) {
  if (!raw || typeof raw !== "object") return null;

  const currentFocus = clampString(raw.currentFocus);
  const recurringThemes = clampStringArray(raw.recurringThemes, LIMITS.maxThemes);
  const progress = clampStringArray(raw.progress, LIMITS.maxProgress);
  const reflectionPrompt = clampString(raw.reflectionPrompt);

  if (!currentFocus || !reflectionPrompt) return null;

  return {
    currentFocus,
    recurringThemes,
    progress,
    reflectionPrompt,
  };
}

module.exports = {
  SCHEMA_VERSION,
  LIMITS,
  CACHE_MAX_AGE_MS,
  validateIntelligence,
};
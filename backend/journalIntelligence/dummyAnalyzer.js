/*
 * Deterministic analyzer. No Gemini, no quota.
 *
 * It does real work - term frequency, theme drift between older and newer
 * entries, writing cadence - so the endpoint produces something alive
 * during development, and so it stays useful as the fallback whenever the
 * Gemini analyzer errors or returns malformed JSON.
 */

const STOPWORDS = new Set(
  (
    "a about after all also am an and any are as at be because been before being but by can " +
    "could did do does doing done down each even for from further had has have having he her " +
    "here hers him his how i if in into is it its just me more most my no nor not now of off " +
    "on once only or other our out over own same she should so some such than that the their " +
    "them then there these they this those through to too under until up very was we were what " +
    "when where which while who whom why will with would you your today really thing things " +
    "feel feeling felt like want get got make made going go went know think much many still " +
    "been over back time day days"
  ).split(" ")
);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
}

/**
 * Terms ranked by how many entries they appear in.
 *
 * Counting each term once per entry means a single long entry cannot
 * dominate the theme list by repeating a word twenty times.
 */
function topTerms(entries, limit) {
  const counts = new Map();

  for (const entry of entries) {
    for (const term of new Set(tokenize(entry.content))) {
      counts.set(term, (counts.get(term) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1 || entries.length < 3)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

function daysBetween(a, b) {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * @param {Array<{id: string, content: string, createdAt: Date|null}>} entries
 *        newest first
 */
async function analyze(entries) {
  if (entries.length === 0) {
    return {
      currentFocus: "You haven't written anything yet.",
      recurringThemes: [],
      progress: [],
      reflectionPrompt: "What's occupying your mind right now?",
    };
  }

  const recent = entries.slice(0, 3);
  const older = entries.slice(3);

  const recentTerms = topTerms(recent, 4);
  const allThemes = topTerms(entries, 5);
  const olderThemes = new Set(topTerms(older, 8));
  const emerging = recentTerms.filter((term) => !olderThemes.has(term));
  const persistent = allThemes.filter((term) => olderThemes.has(term));

  const currentFocus = recentTerms.length
    ? `Your recent reflections centre on ${recentTerms.slice(0, 3).join(", ")}.`
    : "Your recent reflections cover a wide range of ground.";

  const progress = [];

  const dated = entries.map((entry) => entry.createdAt).filter(Boolean);

  if (dated.length >= 2) {
    const span = daysBetween(dated[0], dated[dated.length - 1]);
    const perWeek = span > 0 ? (dated.length / span) * 7 : dated.length;

    progress.push(
      `${entries.length} entries over ${Math.max(1, Math.round(span))} days, ` +
        `about ${perWeek.toFixed(1)} a week.`
    );
  }

  if (emerging.length && older.length) {
    progress.push(`New ground since your earlier entries: ${emerging.join(", ")}.`);
  }

  if (persistent.length) {
    progress.push(`Still carrying: ${persistent.slice(0, 3).join(", ")}.`);
  }

  const promptSubject = recentTerms[0] || allThemes[0];

  const reflectionPrompt = promptSubject
    ? `You keep returning to ${promptSubject}. What would change if that resolved tomorrow?`
    : "What has shifted for you since you last wrote?";

  return {
    currentFocus,
    recurringThemes: allThemes,
    progress,
    reflectionPrompt,
  };
}

module.exports = {
  name: "dummy-v1",
  analyze,
};
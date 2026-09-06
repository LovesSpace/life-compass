/*
 * Deterministic analyzer. No Gemini, no quota.
 * Also serves as the fallback when the Gemini analyzer fails.
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
    "time day days back " +
    // filler adjectives, adverbs and connectives that otherwise surface as themes
    "actually better best worse always never often sometimes maybe perhaps quite rather almost " +
    "instead though although however anyway besides meanwhile afterwards eventually finally " +
    "morning afternoon evening night week weeks month months year years yesterday tomorrow " +
    "little lot lots bit good great nice bad okay fine sure ready keep keeps kept lost lose " +
    "close closer barely hardly nearly enough away around whole every another something " +
    "anything nothing everything someone anyone everyone able need needed needs"
  ).split(" ")
);

/*
 * Maps raw terms to readable theme labels, so the dashboard shows
 * "Work & career" instead of "deadline". Anything not in the lexicon falls
 * back to the capitalised term, but only when it recurs across entries.
 */
const THEME_LEXICON = {
  "Work & career": ["work", "career", "job", "office", "team", "meeting", "meetings", "manager", "client", "interview", "promotion", "colleague", "deadline", "deadlines"],
  "Learning & skills": ["learn", "learning", "study", "studying", "course", "courses", "reading", "book", "books", "tutorial", "practice", "skill", "skills", "revision", "notes"],
  "Personal projects": ["project", "projects", "build", "building", "code", "coding", "app", "launch", "ship", "shipped", "feature", "prototype", "architecture", "design"],
  "Time & focus": ["schedule", "busy", "procrastinate", "procrastination", "focus", "distraction", "distracted", "planning", "plans", "priorities", "routine", "habit", "habits"],
  "Health & energy": ["sleep", "sleeping", "exercise", "running", "walk", "walking", "workout", "energy", "rest", "fitness", "swimming", "cycling", "gym"],
  "People & relationships": ["friend", "friends", "family", "partner", "mother", "father", "parents", "sister", "brother", "conversation", "conversations"],
  "Money & planning": ["money", "budget", "savings", "expenses", "rent", "spending", "finances"],
  "Home & environment": ["home", "house", "flat", "apartment", "moving", "room", "city"],
};

const TERM_TO_THEME = new Map();

for (const [label, terms] of Object.entries(THEME_LEXICON)) {
  for (const term of terms) {
    TERM_TO_THEME.set(term, label);
  }
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
}

/**
 * Terms ranked by how many entries they appear in, as [term, count] pairs.
 *
 * Counting each term once per entry means a single long entry cannot
 * dominate the theme list by repeating a word twenty times.
 */
function rankTerms(entries, limit) {
  const counts = new Map();

  for (const entry of entries) {
    for (const term of new Set(tokenize(entry.content))) {
      counts.set(term, (counts.get(term) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function capitalise(term) {
  return term.charAt(0).toUpperCase() + term.slice(1);
}

/**
 * Turn ranked [term, count] pairs into readable, de-duplicated labels.
 *
 * Terms in the lexicon are always eligible. Terms outside it need to appear
 * in at least two entries before they count as a theme, which is what keeps
 * one-off words out of the list.
 */
function labelThemes(ranked, limit) {
  const labels = [];

  for (const [term, count] of ranked) {
    const known = TERM_TO_THEME.get(term);

    if (!known && count < 2) continue;

    const label = known || capitalise(term);

    if (!labels.includes(label)) {
      labels.push(label);
    }

    if (labels.length >= limit) break;
  }

  return labels;
}

function joinLabels(labels) {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];

  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

function daysBetween(a, b) {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function averageLength(entries) {
  if (entries.length === 0) return 0;

  const total = entries.reduce((sum, entry) => sum + entry.content.length, 0);

  return total / entries.length;
}

/**
 * A short, plain-language read on the recent journal as a whole.
 *
 * Deliberately descriptive - what the entries show - never a psychological
 * or medical interpretation.
 */
function buildSummary({ recentLabels, emergingLabels, persistentLabels, recent, older }) {
  const parts = [];

  parts.push(
    recentLabels.length
      ? `Your recent entries revolve mostly around ${joinLabels(recentLabels.slice(0, 2)).toLowerCase()}.`
      : "Your recent entries range across a number of different topics."
  );

  if (older.length === 0) {
    parts.push(
      "There is not much history yet, so this is an early read - it will sharpen as you keep writing."
    );

    return parts.join(" ");
  }

  if (emergingLabels.length && persistentLabels.length) {
    parts.push(
      `${persistentLabels[0]} has been with you throughout, while ${emergingLabels[0].toLowerCase()} is newer.`
    );
  } else if (emergingLabels.length) {
    parts.push(`${emergingLabels[0]} is new ground compared with your earlier entries.`);
  } else if (persistentLabels.length) {
    parts.push(`${persistentLabels[0]} has stayed consistent across the whole period.`);
  }

  const recentAvg = averageLength(recent);
  const olderAvg = averageLength(older);

  if (olderAvg > 0) {
    if (recentAvg > olderAvg * 1.4) {
      parts.push("You are also writing at greater length than you were earlier on.");
    } else if (recentAvg < olderAvg * 0.6) {
      parts.push("Your recent entries are shorter than your earlier ones.");
    }
  }

  return parts.join(" ");
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
      summary:
        "There is nothing to read yet. Write a few reflections and this overview will fill in.",
      reflectionPrompt: "What's occupying your mind right now?",
    };
  }

  const recent = entries.slice(0, 3);
  const older = entries.slice(3);

  const recentRanked = rankTerms(recent, 8);
  const allRanked = rankTerms(entries, 12);
  const olderLabels = new Set(labelThemes(rankTerms(older, 12), 8));

  const recentLabels = labelThemes(recentRanked, 3);
  const themeLabels = labelThemes(allRanked, 5);

  const emergingLabels = recentLabels.filter((label) => !olderLabels.has(label));
  const persistentLabels = themeLabels.filter((label) => olderLabels.has(label));

  const currentFocus = recentLabels.length
    ? `${joinLabels(recentLabels)}.`
    : "No single focus stands out across your recent entries.";

  const progress = [];

  const dated = entries.map((entry) => entry.createdAt).filter(Boolean);

  if (dated.length >= 2) {
    const span = daysBetween(dated[0], dated[dated.length - 1]);
    const days = Math.max(1, Math.round(span));
    const perWeek = span > 0 ? (dated.length / span) * 7 : dated.length;

    progress.push(
      `${entries.length} entries over ${days} ${days === 1 ? "day" : "days"}, ` +
        `about ${perWeek.toFixed(1)} a week.`
    );
  }

  if (emergingLabels.length && older.length) {
    progress.push(
      `You have moved onto new ground since your earlier entries: ${joinLabels(
        emergingLabels.slice(0, 2)
      ).toLowerCase()}.`
    );
  }

  if (persistentLabels.length) {
    progress.push(
      `You are still working through ${joinLabels(persistentLabels.slice(0, 2)).toLowerCase()}.`
    );
  }

  const promptSubject = (recentLabels[0] || themeLabels[0] || "").toLowerCase();

  const reflectionPrompt = promptSubject
    ? `You keep returning to ${promptSubject}. What would meaningful progress on that look like over the next month?`
    : "What has shifted for you since you last wrote?";

  const summary = buildSummary({
    recentLabels,
    emergingLabels,
    persistentLabels,
    recent,
    older,
  });

  return {
    currentFocus,
    recurringThemes: themeLabels,
    progress,
    summary,
    reflectionPrompt,
  };
}

module.exports = {
  name: "dummy-v1",
  analyze,
};
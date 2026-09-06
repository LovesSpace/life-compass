const { generateGeminiResponse } = require("../geminiService");
const { LIMITS } = require("./schema");

/*
 * Same interface as dummyAnalyzer: { name, analyze(entries) }.
 *
 * This file is only ever selected when USE_REAL_GEMINI === "true".
 * If the model errors or returns something that is not valid JSON, we throw
 * and the orchestrator falls back to the deterministic analyzer, so a bad
 * model response degrades the output rather than breaking the endpoint.
 */

function buildPrompt(entries) {
  const numbered = entries
    .map((entry, index) => {
      const date = entry.createdAt
        ? entry.createdAt.toISOString().slice(0, 10)
        : "undated";

      return `[${index + 1}] (${date}) ${entry.content}`;
    })
    .join("\n\n");

  return `You are analysing a person's private journal entries, newest first.

Return ONLY a JSON object. No markdown, no code fences, no commentary.

Shape:
{
  "currentFocus": "one or two sentences on what currently occupies them",
  "recurringThemes": ["short phrase", "..."],
  "progress": ["one observation about what has shifted over time", "..."],
  "reflectionPrompt": "one open question that would help them go deeper"
}

Rules:
- At most ${LIMITS.maxThemes} recurringThemes and ${LIMITS.maxProgress} progress items.
- Each string under ${LIMITS.maxFieldChars} characters.
- Do not quote the entries back. Summarise in your own words.
- Be specific and warm. Never diagnose or give medical advice.

Entries:
${numbered}`;
}

function parseJsonResponse(text) {
  if (typeof text !== "string") {
    throw new Error("Gemini returned a non-string response");
  }

  // Strip code fences if the model added them despite instructions.
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();

  // Take the outermost JSON object, ignoring any stray prose around it.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in Gemini response");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

async function analyze(entries) {
  if (entries.length === 0) {
    return {
      currentFocus: "You haven't written anything yet.",
      recurringThemes: [],
      progress: [],
      reflectionPrompt: "What's occupying your mind right now?",
    };
  }

  const raw = await generateGeminiResponse(buildPrompt(entries));

  return parseJsonResponse(raw);
}

module.exports = {
  name: "gemini-v1",
  analyze,
};
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
const { GoogleGenAI } = require("@google/genai");

const secretClient = new SecretManagerServiceClient();

let cachedApiKey = null;
let cachedClient = null;

// Real Gemini is used only when explicitly enabled.
const USE_REAL_GEMINI = process.env.USE_REAL_GEMINI === "true";

// Project comes from the environment on Cloud Run, so the code is not
// pinned to one project. Falls back to the original hardcoded value.
const PROJECT_ID =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  "life-compass-507705";

const SECRET_NAME = process.env.GEMINI_SECRET_NAME || "gemini-api-key";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 20000);

const DEV_RESPONSE =
  "I'm your Life Compass AI. I received your reflection and I'm ready to help you explore it.";

async function getGeminiApiKey() {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  const [version] = await secretClient.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/${SECRET_NAME}/versions/latest`,
  });

  cachedApiKey = version.payload.data.toString("utf8").trim();

  return cachedApiKey;
}

async function getClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = await getGeminiApiKey();

  cachedClient = new GoogleGenAI({ apiKey });

  return cachedClient;
}

/**
 * Pull the text out of a response without assuming one exact SDK shape.
 *
 * The SDK is under active development and the response object differs
 * between generateContent and the Interactions API, so we check the known
 * shapes in order rather than hardcoding one property.
 */
function extractText(response) {
  if (!response) return null;

  if (typeof response === "string") return response;

  // generateContent: response.text (getter on current versions)
  if (typeof response.text === "string" && response.text.trim()) {
    return response.text;
  }

  // Older shape where text is a method
  if (typeof response.text === "function") {
    const value = response.text();
    if (typeof value === "string" && value.trim()) return value;
  }

  // Interactions API
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  if (typeof response.outputText === "string" && response.outputText.trim()) {
    return response.outputText;
  }

  // Raw candidate walk, the most stable fallback of all
  const parts = response?.candidates?.[0]?.content?.parts;

  if (Array.isArray(parts)) {
    const joined = parts
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();

    if (joined) return joined;
  }

  return null;
}

function withTimeout(promise, ms) {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Gemini request timed out after ${ms}ms`)),
      ms
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * @param {string} prompt
 * @param {object} [options]
 * @param {string} [options.fallback] returned instead of throwing when the
 *        call fails - lets chat degrade rather than 500.
 */
async function generateGeminiResponse(prompt, { fallback = null } = {}) {
  // Development mode: don't call Gemini at all.
  if (!USE_REAL_GEMINI) {
    return DEV_RESPONSE;
  }

  try {
    const ai = await getClient();

    const response = await withTimeout(
      ai.models.generateContent({
        model: MODEL,
        contents: prompt,
      }),
      REQUEST_TIMEOUT_MS
    );

    const text = extractText(response);

    if (!text) {
      console.error(
        "Gemini returned no usable text. Response keys:",
        Object.keys(response || {})
      );

      if (fallback !== null) return fallback;

      throw new Error("Gemini returned an empty response");
    }

    return text.trim();
  } catch (error) {
    console.error("Gemini request failed:", error.message);

    if (fallback !== null) return fallback;

    throw error;
  }
}

module.exports = {
  generateGeminiResponse,
  extractText,
  MODEL,
  PROJECT_ID,
  SECRET_NAME,
  USE_REAL_GEMINI,
};
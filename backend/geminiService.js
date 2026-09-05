const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
const { GoogleGenAI } = require("@google/genai");

const secretClient = new SecretManagerServiceClient();

let cachedApiKey = null;

// Real Gemini is used only when explicitly enabled.
const USE_REAL_GEMINI = process.env.USE_REAL_GEMINI === "true";

async function getGeminiApiKey() {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  const [version] = await secretClient.accessSecretVersion({
    name: "projects/life-compass-507705/secrets/gemini-api-key/versions/latest",
  });

  cachedApiKey = version.payload.data.toString("utf8");

  return cachedApiKey;
}

async function generateGeminiResponse(prompt) {
  // Development mode: don't call Gemini at all.
  if (!USE_REAL_GEMINI) {
    return "I'm your Life Compass AI. I received your reflection and I'm ready to help you explore it.";
  }

  // Real Gemini mode.
  const apiKey = await getGeminiApiKey();

  const ai = new GoogleGenAI({
    apiKey,
  });

  const interaction = await ai.interactions.create({
    model: "gemini-3.5-flash-lite",
    input: prompt,
  });

  return interaction.output_text;
}

module.exports = {
  generateGeminiResponse,
};
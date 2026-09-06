/*
 * One-off Gemini diagnostic. Run it directly, not through the server:
 *
 *   cd ~/life-compass/backend
 *   USE_REAL_GEMINI=true node scripts/probeGemini.js
 *
 * It answers four questions in order, and tells you which step failed:
 *   1. Can we read the API key out of Secret Manager?
 *   2. Does the model name resolve?
 *   3. What does the response object actually look like?
 *   4. Does our extractText() find the text in it?
 *
 * Delete this file before submission, or leave it - it is not wired into
 * the server and has no route.
 */

const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
const { GoogleGenAI } = require("@google/genai");

const {
  extractText,
  MODEL,
  PROJECT_ID,
  SECRET_NAME,
} = require("../geminiService");

const PROMPT = "Reply with exactly: Life Compass Gemini connection successful.";

async function main() {
  console.log("Project :", PROJECT_ID);
  console.log("Secret  :", SECRET_NAME);
  console.log("Model   :", MODEL);
  console.log("");

  // 1. Secret Manager
  console.log("[1/4] Reading API key from Secret Manager...");

  let apiKey;

  try {
    const client = new SecretManagerServiceClient();

    const [version] = await client.accessSecretVersion({
      name: `projects/${PROJECT_ID}/secrets/${SECRET_NAME}/versions/latest`,
    });

    apiKey = version.payload.data.toString("utf8").trim();

    console.log(`      OK - key length ${apiKey.length}, starts "${apiKey.slice(0, 6)}..."`);
  } catch (error) {
    console.error("      FAILED:", error.message);
    console.error("      Check the secret exists and this account has roles/secretmanager.secretAccessor.");
    process.exit(1);
  }

  // 2 + 3. Call the model
  console.log("\n[2/4] Calling the model...");

  let response;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const started = Date.now();

    response = await ai.models.generateContent({
      model: MODEL,
      contents: PROMPT,
    });

    console.log(`      OK - responded in ${Date.now() - started}ms`);
  } catch (error) {
    console.error("      FAILED:", error.message);
    console.error("      A 404 usually means the model name is wrong for this API version.");
    console.error("      A 403 usually means the API key is invalid or the API is not enabled.");
    process.exit(1);
  }

  console.log("\n[3/4] Response shape");
  console.log("      top-level keys:", Object.keys(response || {}));
  console.log("      typeof response.text:", typeof response?.text);
  console.log("      has candidates:", Array.isArray(response?.candidates));

  // 4. Our extraction
  console.log("\n[4/4] extractText()");

  const text = extractText(response);

  if (!text) {
    console.error("      FAILED - no text found. Full response below:");
    console.dir(response, { depth: 6 });
    process.exit(1);
  }

  console.log("      OK");
  console.log("\n--- model said ---");
  console.log(text.trim());
  console.log("------------------");
  console.log("\nAll four checks passed. Safe to set USE_REAL_GEMINI=true on the server.");
}

main().catch((error) => {
  console.error("\nUnexpected failure:", error);
  process.exit(1);
});
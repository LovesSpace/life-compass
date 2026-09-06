const express = require("express");
const cors = require("cors");
const path = require("path");

const { initializeApp, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { generateGeminiResponse } = require("./geminiService");

// 1. Initialize Express App
const app = express();

// 2. Middleware
app.use(cors());
app.use(express.json());

// 3. Initialize Firebase Admin FIRST (Before importing routes that call getFirestore)
if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

// 4. Require routes AFTER Firebase Admin initialization
const { authenticateUser } = require("./authMiddleware");
const journalRoutes = require("./journalRoutes");
const chatRoutes = require("./chatRoutes");
const memoryRoutes = require("./memoryRoutes");
const insightRoutes = require("./insightRoutes");

// 5. API Endpoints
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "life-compass",
  });
});

app.get("/api/me", authenticateUser, (req, res) => {
  res.json({
    authenticated: true,
    uid: req.user.uid,
    email: req.user.email,
  });
});

app.get("/api/test-gemini", authenticateUser, async (req, res) => {
  try {
    const response = await generateGeminiResponse(
      "Reply with exactly: Life Compass Gemini connection successful."
    );

    res.json({
      status: "ok",
      response,
    });
  } catch (error) {
    console.error("Gemini test error:", error);

    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

app.use("/api/journal", journalRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/memories", memoryRoutes);
app.use("/api/insights", insightRoutes);


// 6. Serve React Frontend Static Files
const frontendPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendPath));

// SPA fallback for non-API GET requests
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    res.sendFile(path.join(frontendPath, "index.html"));
    return;
  }
  next();
});

// 7. Start Server
app.listen(8080, "0.0.0.0", () => {
  console.log("Life Compass backend running on port 8080");
});
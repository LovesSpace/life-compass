const { getAuth } = require("firebase-admin/auth");

async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const customHeader = req.headers["x-auth-token"];

    let idToken = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      idToken = authHeader.split("Bearer ")[1];
    } else if (customHeader) {
      idToken = customHeader;
    }

    if (!idToken) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const decodedToken = await getAuth().verifyIdToken(idToken);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      error: "Invalid or expired authentication token",
    });
  }
}

module.exports = { authenticateUser };
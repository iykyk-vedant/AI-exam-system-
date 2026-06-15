const admin = require("firebase-admin");
require("dotenv").config();
const envConfig = require("./env");

// Ensure private key string parses escaped newlines correctly from environment variables
const privateKey = envConfig.firebase.privateKey
  ? envConfig.firebase.privateKey.replace(/\\n/g, "\n")
  : undefined;

if (envConfig.firebase.projectId && privateKey && envConfig.firebase.clientEmail) {
  try {
    // Initialize admin instance
    admin.initializeApp({
      credential: admin.cert({
        projectId: envConfig.firebase.projectId,
        clientEmail: envConfig.firebase.clientEmail,
        privateKey: privateKey,
      })
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Firebase Admin SDK initialization failed:", error.message);
  }
}

module.exports = admin;

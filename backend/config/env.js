/**
 * Centralized environment configuration
 * Loads and validates all required environment variables
 */

require("dotenv").config();

const requiredEnvVars = {
  production: ["DATABASE_URL", "OPENAI_API_KEY", "GEMINI_API_KEY", "QDRANT_URL", "JWT_SECRET"],
  development: ["DATABASE_URL", "OPENAI_API_KEY", "GEMINI_API_KEY"],
};

const envConfig = {
  // Database
  database: {
    url: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/secureexam_ai",
  },

  // OpenAI API
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },

  // Gemini API
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },

  // Qdrant Vector Database
  qdrant: {
    url: process.env.QDRANT_URL || "http://localhost:6333",
    apiKey: process.env.QDRANT_API_KEY || null,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-key-change-in-production",
  },

  // Server
  server: {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || "development",
  },

  // Firebase
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },

  // Application
  app: {
    name: process.env.APP_NAME || "SECUREEXAM AI",
    version: process.env.APP_VERSION || "1.0.0",
  },
};

// Validate required environment variables
function validateEnv() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const required = requiredEnvVars[nodeEnv] || requiredEnvVars.development;

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(
      `⚠️  Missing environment variables (${nodeEnv}): ${missing.join(", ")}`
    );
    if (nodeEnv === "production") {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
  }
}

// Validate on module load
validateEnv();

module.exports = envConfig;

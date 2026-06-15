const { Pool } = require("pg");
const envConfig = require("./env");

// Initialize PG Connection Pool using Neon DB URL
const pool = new Pool({
  connectionString: envConfig.database.url,
  ssl: {
    rejectUnauthorized: false // Required for secure Neon PostgreSQL connection
  }
});

pool.on("connect", () => {
  console.log("PostgreSQL database connection pool established.");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err);
  // Do not call process.exit(-1) to prevent the backend from crashing when idle Neon connections are closed.
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};

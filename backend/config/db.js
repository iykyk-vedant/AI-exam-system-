const { Pool } = require("pg");
require("dotenv").config();

// Initialize PG Connection Pool using Neon DB URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for secure Neon PostgreSQL connection
  }
});

pool.on("connect", () => {
  console.log("PostgreSQL database connection pool established.");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};

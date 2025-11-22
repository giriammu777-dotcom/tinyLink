// src/db.js
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Neon on Render
  max: 5,                // Prevent too many connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Debug idle client errors
pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle PostgreSQL client:", err);
});

// Test DB connection once at startup
(async function verifyConnection() {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to Neon PostgreSQL (pool verified)");
    client.release();
  } catch (err) {
    console.error("❌ DB Connection Error at startup:", err);
    // DO NOT exit — Render needs logs
  }
})();

export default pool;

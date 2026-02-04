// src/config/database.js
// PostgreSQL database configuration and connection pool setup

const { Pool } = require("pg");
require("dotenv").config();

/**
 * PostgreSQL Connection Pool
 * Using a connection pool allows multiple database queries to be executed concurrently
 * without opening a new connection for each query
 */
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Maximum number of clients in the pool
  max: 20,
  // How long a client is allowed to remain idle before being closed
  idleTimeoutMillis: 30000,
  // How long to wait for a connection to become available
  connectionTimeoutMillis: 2000,
});

/**
 * Test database connection on startup
 */
pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

/**
 * Handle connection errors
 */
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

/**
 * Execute a query with parameters
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} - Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Executed query", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
};

/**
 * basically wrapper hai ye pool.query ke upr we are overriding the query method
 * So instead of:
pool.query("SELECT * FROM users");
You do:
query("SELECT * FROM users WHERE id = $1", [id]);
Much cleaner debugging in production logs.



 * Get a client from the pool for transaction support
 * Remember to release the client after use
 */
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  // Set a timeout of 5 seconds, after which we'll log this client's last query
  const timeout = setTimeout(() => {
    console.error("A client has been checked out ");
  }, 5000);

  // Monkey patch the query method to clear timeout on query
  client.query = (...args) => {
    clearTimeout(timeout);
    return query(...args);
  };

  // Monkey patch the release method to clear timeout
  client.release = () => {
    clearTimeout(timeout);
    return release();
  };

  return client;
};

module.exports = {
  query,
  getClient,
  pool,
};

/**
 * 
 * basically isme ho kya rha hai ki in postgress we have methods/functions
 * like query jo ki use hote hai query(GET * FROM TABLE1), getclient()
 * aur pool
 * pool jo hai -- creates multiple db connections
 *              reuses them
 *              prevents opening new conn for every query  which will make  this slow
 *         
 * aur getclient picks one client from pool and hands its 
 * control to you 
 * we then run queries and then release the client 
 * because during transactions kuch queries sath chalne chaiye ATOMIC 
 * warna roll back kardo 
 * ex---
 * BEGIN;
INSERT INTO orders ...
INSERT INTO payments ...
COMMIT;     

Pool’s query() cannot guarantee the same connection is used each time.
getClient() can.


now hum kya kree hai is that we are monkey patching orr overidding the 
already 3 functions of pool
and hum usme error handling and timeouts add krre hai
ex--
in pool we added the max limit,idle timout 
in query we added query logging,query timing,row count,error logging 
in getClient we added timeout alarm jo ki 5 sec ki inactivity pr
warning deta hai ki clint has been logged out

then hum teeno funcitons ko return krte hai taki bahar jha bhi ye use ho toh
hum ye overridden wale funs use kre

 * 
 * 
 * 
 * 
 * 
 */








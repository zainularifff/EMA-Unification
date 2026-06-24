// backend/queries/queries_EMA.js

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const sql = require("mssql");

const envPaths = [
  path.join(__dirname, "..", ".env"),
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), "backend", ".env"),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

function readEnv(names, fallback = "") {
  for (const name of names) {
    const value = process.env[name];
    if (value && String(value).trim()) return String(value).trim();
  }

  return fallback;
}

const dbConfig = {
  user: readEnv(["DB_USER", "SQL_USER"]),
  password: readEnv(["DB_PASSWORD", "SQL_PASSWORD"]),
  server: readEnv(["DB_SERVER", "SQL_SERVER"], "192.168.140.105"),
  database: readEnv(
    ["EMA_DB_DATABASE", "DB_NAME", "DB_DATABASE", "SQL_DATABASE"],
    "TCO2"
  ),
  port: Number(readEnv(["DB_PORT", "SQL_PORT"], "1433")),
  options: {
    encrypt: String(readEnv(["DB_ENCRYPT"], "false")) === "true",
    trustServerCertificate:
      String(readEnv(["DB_TRUST_CERT"], "true")) === "true",
  },
};

let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig);
  }

  return poolPromise;
}

async function executeQuery(query, params = {}) {
  const pool = await getPool();
  const request = pool.request();

  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });

  const result = await request.query(query);
  return result.recordset || [];
}

async function executeScalar(query, params = {}) {
  const rows = await executeQuery(query, params);
  const firstRow = rows[0];

  if (!firstRow) {
    return null;
  }

  const firstKey = Object.keys(firstRow)[0];
  return firstRow[firstKey];
}

async function executeNonQuery(query, params = {}) {
  const pool = await getPool();
  const request = pool.request();

  Object.entries(params).forEach(([key, value]) => {
    request.input(key, value);
  });

  const result = await request.query(query);
  return result.rowsAffected || [];
}

/**
 * Auth query
 * Adjust table/column name later once we confirm current DB schema.
 */
async function findUserByUsername(username) {
  const query = `
    SELECT TOP 1
      console_Idn,
      userID,
      menuIndex
    FROM EMA_Users
    WHERE userID = @username
  `;

  const rows = await executeQuery(query, { username });
  return rows[0] || null;
}

async function loginUser(username) {
  return findUserByUsername(username);
}

/**
 * Hardware Inventory base queries.
 * These are safe defaults for EMA_ prefix tables.
 * Adjust table name if your DB still uses old table names.
 */
async function getHardwareInventory() {
  const query = `
    SELECT *
    FROM EMA_HardwareInventory
    ORDER BY 1 DESC
  `;

  return executeQuery(query);
}

async function getHardwareById(id) {
  const query = `
    SELECT TOP 1 *
    FROM EMA_HardwareInventory
    WHERE id = @id
  `;

  const rows = await executeQuery(query, { id });
  return rows[0] || null;
}

async function createHardware(payload = {}) {
  const query = `
    INSERT INTO EMA_HardwareInventory (
      assetTag,
      deviceName,
      category,
      brand,
      model,
      serialNumber,
      status,
      assignedTo,
      location,
      createdAt
    )
    VALUES (
      @assetTag,
      @deviceName,
      @category,
      @brand,
      @model,
      @serialNumber,
      @status,
      @assignedTo,
      @location,
      GETDATE()
    )
  `;

  return executeNonQuery(query, {
    assetTag: payload.assetTag || "",
    deviceName: payload.deviceName || "",
    category: payload.category || "",
    brand: payload.brand || "",
    model: payload.model || "",
    serialNumber: payload.serialNumber || "",
    status: payload.status || "Available",
    assignedTo: payload.assignedTo || "",
    location: payload.location || "",
  });
}

async function updateHardware(id, payload = {}) {
  const query = `
    UPDATE EMA_HardwareInventory
    SET
      assetTag = @assetTag,
      deviceName = @deviceName,
      category = @category,
      brand = @brand,
      model = @model,
      serialNumber = @serialNumber,
      status = @status,
      assignedTo = @assignedTo,
      location = @location,
      updatedAt = GETDATE()
    WHERE id = @id
  `;

  return executeNonQuery(query, {
    id,
    assetTag: payload.assetTag || "",
    deviceName: payload.deviceName || "",
    category: payload.category || "",
    brand: payload.brand || "",
    model: payload.model || "",
    serialNumber: payload.serialNumber || "",
    status: payload.status || "Available",
    assignedTo: payload.assignedTo || "",
    location: payload.location || "",
  });
}

async function deleteHardware(id) {
  const query = `
    DELETE FROM EMA_HardwareInventory
    WHERE id = @id
  `;

  return executeNonQuery(query, { id });
}

/**
 * Compatibility aliases.
 * These help if server.js uses slightly different names.
 */
module.exports = {
  sql,
  dbConfig,
  getPool,

  executeQuery,
  executeScalar,
  executeNonQuery,

  query: executeQuery,
  execute: executeQuery,
  runQuery: executeQuery,

  findUserByUsername,
  loginUser,
  getUserByUsername: findUserByUsername,

  getHardwareInventory,
  getHardwareList: getHardwareInventory,
  getAllHardware: getHardwareInventory,

  getHardwareById,
  createHardware,
  updateHardware,
  deleteHardware,
};
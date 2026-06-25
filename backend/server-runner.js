const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const jwt = require('jsonwebtoken');
const sql = require('mssql');
const registerNotificationSettingsRoutes = require('./notificationSettingsRoutes');
const registerAiAssistRoutes = require('./aiAssistRoutes');

const dbConfig = {
  user: process.env.DB_USER || process.env.SQL_USER,
  password: process.env.DB_PASSWORD || process.env.SQL_PASSWORD,
  server: process.env.DB_SERVER || process.env.SQL_SERVER,
  database: process.env.DB_NAME || process.env.DB_DATABASE || process.env.SQL_DATABASE || 'TCO2',
  connectionTimeout: 30000,
  requestTimeout: 60000,
  options: {
    encrypt: String(process.env.DB_ENCRYPT || 'false') === 'true',
    trustServerCertificate: String(process.env.DB_TRUST_CERT || 'true') === 'true'
  }
};

function notificationAuthenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization token missing' });
  }

  jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET,
    { issuer: 'ema-node-api', audience: 'ema-react-app' },
    (err, user) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    }
  );
}

const expressPath = require.resolve('express');
const originalExpress = require(expressPath);

function wrappedExpress(...args) {
  const app = originalExpress(...args);

  if (!app.__emaNotificationRoutesRegistered) {
    app.__emaNotificationRoutesRegistered = true;
    registerNotificationSettingsRoutes(app, {
      authenticateToken: notificationAuthenticateToken,
      dbConfig,
      sql
    });
  }

  if (!app.__emaAiAssistRoutesRegistered) {
    app.__emaAiAssistRoutesRegistered = true;
    registerAiAssistRoutes(app, {
      authenticateToken: notificationAuthenticateToken
    });
  }

  return app;
}

Object.assign(wrappedExpress, originalExpress);
require.cache[expressPath].exports = wrappedExpress;

require('./server.js');

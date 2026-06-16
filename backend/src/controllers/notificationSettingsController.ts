import { Response } from 'express';
import { getPool, sql } from '../config/database';
import { AuthRequest } from '../middleware/auth';

const DEFAULT_RULES = [
  ['CRM_CREATED', 0, 0, 'Notify when a new client/customer record is created'],
  ['INCIDENT_CREATED', 1, 1, 'New incident ticket created'],
  ['INCIDENT_RESOLVED', 1, 0, 'Incident ticket resolved or closed'],
  ['INCIDENT_UPDATED', 1, 0, 'Incident ticket updated'],
  ['LEASE_EXPIRY_1M', 0, 0, 'Lease expiring in 1 month'],
  ['LEASE_EXPIRY_1W', 0, 0, 'Lease expiring in 1 week'],
  ['LEASE_EXPIRY_3M', 0, 0, 'Lease expiring in 3 months'],
  ['LICENSE_EXCEEDED', 0, 0, 'Installed assets exceed licensed count'],
];

function bit(value: unknown) {
  return value === true || value === 1 || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'on' ? 1 : 0;
}

function ok(res: Response, data: unknown, message = '') {
  res.json({ success: true, status: 'success', data, message });
}

async function ensureNotificationTables() {
  const pool = await getPool();
  await pool.request().query(`
    IF OBJECT_ID(N'dbo.EmailSettings', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.EmailSettings (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        SmtpHost NVARCHAR(255) NULL,
        SmtpPort INT NULL,
        SmtpUser NVARCHAR(255) NULL,
        SmtpPass NVARCHAR(MAX) NULL,
        SslTls BIT DEFAULT 1,
        Provider NVARCHAR(50) DEFAULT 'SMTP',
        IsActive BIT DEFAULT 1,
        AzureTenantId NVARCHAR(255) NULL,
        AzureClientId NVARCHAR(255) NULL,
        AzureClientSecret NVARCHAR(MAX) NULL,
        AzureUser NVARCHAR(255) NULL,
        AzurePass NVARCHAR(MAX) NULL,
        ExchangeEndpoint NVARCHAR(255) NULL,
        ExchangeDomainUser NVARCHAR(255) NULL,
        ExchangePass NVARCHAR(MAX) NULL,
        GmailUser NVARCHAR(255) NULL,
        GmailPass NVARCHAR(MAX) NULL,
        UpdatedAt DATETIME DEFAULT GETDATE()
      );
    END;

    IF OBJECT_ID(N'dbo.WhatsAppSettings', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.WhatsAppSettings (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        AccountSid NVARCHAR(255) NULL,
        AuthToken NVARCHAR(MAX) NULL,
        FromNumber NVARCHAR(100) NULL,
        IsEnabled BIT DEFAULT 0,
        UpdatedAt DATETIME DEFAULT GETDATE()
      );
    END;

    IF OBJECT_ID(N'dbo.NotificationRules', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.NotificationRules (
        RuleKey NVARCHAR(80) PRIMARY KEY,
        Enabled BIT DEFAULT 0,
        WhatsAppEnabled BIT DEFAULT 0,
        Description NVARCHAR(255) NULL
      );
    END;

    IF COL_LENGTH('dbo.NotificationRules', 'WhatsAppEnabled') IS NULL
      ALTER TABLE dbo.NotificationRules ADD WhatsAppEnabled BIT DEFAULT 0;

    IF OBJECT_ID(N'dbo.NotificationStats', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.NotificationStats (
        [Year] INT NOT NULL,
        [Month] INT NOT NULL,
        WhatsAppCount INT DEFAULT 0,
        PRIMARY KEY ([Year], [Month])
      );
    END;
  `);

  for (const [key, enabled, whatsAppEnabled, description] of DEFAULT_RULES) {
    await pool.request()
      .input('key', sql.NVarChar, key)
      .input('enabled', sql.Bit, enabled)
      .input('waEnabled', sql.Bit, whatsAppEnabled)
      .input('description', sql.NVarChar, description)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.NotificationRules WHERE RuleKey = @key)
          INSERT INTO dbo.NotificationRules (RuleKey, Enabled, WhatsAppEnabled, Description)
          VALUES (@key, @enabled, @waEnabled, @description);
      `);
  }

  return pool;
}

export async function getEmailSettings(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await ensureNotificationTables();
    const result = await pool.request().query(`
      SELECT ID, Provider, SmtpHost, SmtpPort, SmtpUser, SslTls, IsActive,
             AzureTenantId, AzureClientId, AzureUser, ExchangeEndpoint, ExchangeDomainUser, GmailUser, UpdatedAt
      FROM dbo.EmailSettings
      ORDER BY CASE WHEN IsActive = 1 THEN 0 ELSE 1 END, Provider;
    `);
    ok(res, result.recordset || []);
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to load email settings' });
  }
}

export async function saveEmailSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await ensureNotificationTables();
    const body = req.body || {};
    const provider = String(body.provider || 'SMTP');
    const isActive = bit(body.isActive);
    if (isActive) await pool.request().query('UPDATE dbo.EmailSettings SET IsActive = 0');

    const exists = await pool.request().input('provider', sql.NVarChar, provider).query('SELECT TOP 1 ID FROM dbo.EmailSettings WHERE Provider = @provider');
    const id = exists.recordset?.[0]?.ID;
    const request = pool.request()
      .input('provider', sql.NVarChar, provider)
      .input('host', sql.NVarChar, body.host || '')
      .input('port', sql.Int, Number(body.port || 587) || 587)
      .input('user', sql.NVarChar, body.user || '')
      .input('pass', sql.NVarChar, body.pass || '')
      .input('ssl', sql.Bit, bit(body.ssl))
      .input('isActive', sql.Bit, isActive)
      .input('azureTenantId', sql.NVarChar, body.azureTenantId || '')
      .input('azureClientId', sql.NVarChar, body.azureClientId || '')
      .input('azureClientSecret', sql.NVarChar, body.azureClientSecret || '')
      .input('azureUser', sql.NVarChar, body.azureUser || '')
      .input('azurePass', sql.NVarChar, body.azurePass || '')
      .input('exchangeEndpoint', sql.NVarChar, body.exchangeEndpoint || '')
      .input('exchangeDomainUser', sql.NVarChar, body.exchangeDomainUser || '')
      .input('exchangePass', sql.NVarChar, body.exchangePass || '')
      .input('gmailUser', sql.NVarChar, body.gmailUser || '')
      .input('gmailPass', sql.NVarChar, body.gmailPass || '');

    if (id) {
      request.input('id', sql.Int, id);
      await request.query(`
        UPDATE dbo.EmailSettings
        SET SmtpHost=@host, SmtpPort=@port, SmtpUser=@user, SslTls=@ssl, IsActive=@isActive,
            AzureTenantId=@azureTenantId, AzureClientId=@azureClientId, AzureUser=@azureUser,
            ExchangeEndpoint=@exchangeEndpoint, ExchangeDomainUser=@exchangeDomainUser,
            GmailUser=@gmailUser, UpdatedAt=GETDATE()
            ${body.pass ? ', SmtpPass=@pass' : ''}
            ${body.azureClientSecret ? ', AzureClientSecret=@azureClientSecret' : ''}
            ${body.azurePass ? ', AzurePass=@azurePass' : ''}
            ${body.exchangePass ? ', ExchangePass=@exchangePass' : ''}
            ${body.gmailPass ? ', GmailPass=@gmailPass' : ''}
        WHERE ID=@id;
      `);
    } else {
      await request.query(`
        INSERT INTO dbo.EmailSettings
          (Provider, SmtpHost, SmtpPort, SmtpUser, SmtpPass, SslTls, IsActive, AzureTenantId, AzureClientId, AzureClientSecret, AzureUser, AzurePass, ExchangeEndpoint, ExchangeDomainUser, ExchangePass, GmailUser, GmailPass)
        VALUES
          (@provider, @host, @port, @user, @pass, @ssl, @isActive, @azureTenantId, @azureClientId, @azureClientSecret, @azureUser, @azurePass, @exchangeEndpoint, @exchangeDomainUser, @exchangePass, @gmailUser, @gmailPass);
      `);
    }
    ok(res, null, 'Email settings saved');
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to save email settings' });
  }
}

export async function testEmailSettings(_req: AuthRequest, res: Response): Promise<void> {
  res.status(501).json({ success: false, message: 'Email test connection is not enabled in this backend package. Settings can be saved.' });
}

export async function getWhatsAppSettings(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await ensureNotificationTables();
    const result = await pool.request().query('SELECT TOP 1 ID, AccountSid, FromNumber, IsEnabled, UpdatedAt FROM dbo.WhatsAppSettings ORDER BY ID DESC');
    ok(res, result.recordset?.[0] || {});
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to load WhatsApp settings' });
  }
}

export async function saveWhatsAppSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await ensureNotificationTables();
    const body = req.body || {};
    const exists = await pool.request().query('SELECT TOP 1 ID FROM dbo.WhatsAppSettings ORDER BY ID DESC');
    const id = exists.recordset?.[0]?.ID;
    const request = pool.request()
      .input('accountSid', sql.NVarChar, body.accountSid || '')
      .input('fromNumber', sql.NVarChar, body.fromNumber || '')
      .input('tokenValue', sql.NVarChar, body.authToken || '')
      .input('isEnabled', sql.Bit, bit(body.isEnabled));

    if (id) {
      request.input('id', sql.Int, id);
      await request.query(`
        UPDATE dbo.WhatsAppSettings
        SET AccountSid=@accountSid, FromNumber=@fromNumber, IsEnabled=@isEnabled, UpdatedAt=GETDATE()
            ${body.authToken ? ', AuthToken=@tokenValue' : ''}
        WHERE ID=@id;
      `);
    } else {
      await request.query(`
        INSERT INTO dbo.WhatsAppSettings (AccountSid, AuthToken, FromNumber, IsEnabled)
        VALUES (@accountSid, @tokenValue, @fromNumber, @isEnabled);
      `);
    }
    ok(res, null, 'WhatsApp settings saved');
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to save WhatsApp settings' });
  }
}

export async function getWhatsAppUsage(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await ensureNotificationTables();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const limit = Number(process.env.WHATSAPP_MONTHLY_LIMIT || 50) || 50;
    const result = await pool.request().input('year', sql.Int, year).input('month', sql.Int, month).query('SELECT WhatsAppCount FROM dbo.NotificationStats WHERE [Year] = @year AND [Month] = @month');
    const count = Number(result.recordset?.[0]?.WhatsAppCount || 0);
    ok(res, { count, limit, remaining: Math.max(0, limit - count), activeProvider: process.env.WHATSAPP_PROVIDER || 'Twilio' });
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to load WhatsApp usage' });
  }
}

export async function testWhatsAppSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await ensureNotificationTables();
    const testNumber = String(req.body?.testNumber || '').trim();
    if (!testNumber) {
      res.status(400).json({ success: false, message: 'Recipient phone number is required.' });
      return;
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    await pool.request().input('year', sql.Int, year).input('month', sql.Int, month).query(`
      IF EXISTS (SELECT 1 FROM dbo.NotificationStats WHERE [Year]=@year AND [Month]=@month)
        UPDATE dbo.NotificationStats SET WhatsAppCount = ISNULL(WhatsAppCount, 0) + 1 WHERE [Year]=@year AND [Month]=@month;
      ELSE
        INSERT INTO dbo.NotificationStats ([Year], [Month], WhatsAppCount) VALUES (@year, @month, 1);
    `);
    ok(res, { simulated: true }, 'WhatsApp test recorded. Connect provider dispatch in server integration when ready.');
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to record WhatsApp test' });
  }
}

export async function getNotificationRules(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await ensureNotificationTables();
    const result = await pool.request().query('SELECT RuleKey, Enabled, WhatsAppEnabled, Description FROM dbo.NotificationRules ORDER BY RuleKey');
    ok(res, result.recordset || []);
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to load notification rules' });
  }
}

export async function updateNotificationRules(req: AuthRequest, res: Response): Promise<void> {
  try {
    const pool = await ensureNotificationTables();
    const rules = Array.isArray(req.body) ? req.body : [];
    for (const rule of rules) {
      await pool.request()
        .input('key', sql.NVarChar, rule.RuleKey || rule.ruleKey || '')
        .input('enabled', sql.Bit, bit(rule.Enabled ?? rule.enabled))
        .input('waEnabled', sql.Bit, bit(rule.WhatsAppEnabled ?? rule.whatsappEnabled ?? rule.whatsAppEnabled))
        .input('description', sql.NVarChar, rule.Description || rule.description || '')
        .query(`
          IF EXISTS (SELECT 1 FROM dbo.NotificationRules WHERE RuleKey = @key)
            UPDATE dbo.NotificationRules SET Enabled=@enabled, WhatsAppEnabled=@waEnabled, Description=COALESCE(NULLIF(@description, ''), Description) WHERE RuleKey=@key;
          ELSE
            INSERT INTO dbo.NotificationRules (RuleKey, Enabled, WhatsAppEnabled, Description) VALUES (@key, @enabled, @waEnabled, @description);
        `);
    }
    ok(res, null, 'Notification rules updated');
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to update notification rules' });
  }
}

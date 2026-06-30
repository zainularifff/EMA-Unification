const express = require("express");
const sql = require("mssql");
require("dotenv").config();

const router = express.Router();

const ROUTE_VERSION = "friday-live-v2";

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    connectionTimeout: Number(process.env.DB_CONNECTION_TIMEOUT || 15000),
    requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT || 60000),
    pool: {
        max: Number(process.env.DB_POOL_MAX || 10),
        min: Number(process.env.DB_POOL_MIN || 1),
        idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT || 30000),
    },
    options: {
        encrypt: false,
        trustServerCertificate: true,
        appName: process.env.DB_APP_NAME || "EMA-Friday",
    },
};

let poolPromise = null;

async function getPool() {
    if (!poolPromise) {
        poolPromise = sql.connect(dbConfig).catch((error) => {
            poolPromise = null;
            throw error;
        });
    }

    return poolPromise;
}

function cleanText(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
}

function normalizeText(value) {
    return cleanText(value).toLowerCase().replace(/\s+/g, " ");
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function percent(value, total) {
    const numerator = toNumber(value);
    const denominator = toNumber(total);

    if (!denominator) return "0%";

    return `${Math.round((numerator / denominator) * 100)}%`;
}

function dateLabel(value) {
    if (!value) return "Not recorded";

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return cleanText(value) || "Not recorded";
    }

    return parsed.toLocaleString("en-MY", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

async function tableExists(pool, tableName) {
    const result = await pool.request()
        .input("TableName", sql.NVarChar(128), tableName)
        .query(`
            SELECT 1 AS ExistsFlag
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = @TableName;
        `);

    return result.recordset.length > 0;
}

async function columnExists(pool, tableName, columnName) {
    const result = await pool.request()
        .input("TableName", sql.NVarChar(128), tableName)
        .input("ColumnName", sql.NVarChar(128), columnName)
        .query(`
            SELECT 1 AS ExistsFlag
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @TableName
              AND COLUMN_NAME = @ColumnName;
        `);

    return result.recordset.length > 0;
}

function resolveIntent(message) {
    const text = normalizeText(message);

    if (
        text.includes("endpoint") ||
        text.includes("endpoints") ||
        text.includes("device") ||
        text.includes("devices") ||
        text.includes("asset") ||
        text.includes("assets") ||
        text.includes("hardware") ||
        text.includes("health") ||
        text.includes("online") ||
        text.includes("offline") ||
        text.includes("active") ||
        text.includes("inactive")
    ) {
        return "endpoint_health";
    }

    if (
        text.includes("risk") ||
        text.includes("risks") ||
        text.includes("risky") ||
        text.includes("stale") ||
        text.includes("aging") ||
        text.includes("attention")
    ) {
        return "risk_review";
    }

    if (
        text.includes("patch") ||
        text.includes("patches") ||
        text.includes("unpatched") ||
        text.includes("security update") ||
        text.includes("hotfix")
    ) {
        return "patch_risks";
    }

    if (
        text.includes("setting") ||
        text.includes("settings") ||
        text.includes("audit") ||
        text.includes("policy") ||
        text.includes("changes") ||
        text.includes("change")
    ) {
        return "settings_changes";
    }

    return "general";
}

async function getEndpointHealth(pool) {
    const summary = {
        totalEndpoints: 0,
        connectedEndpoints: 0,
        disconnectedEndpoints: 0,
        attentionNeeded: 0,
        latestConnection: null,
    };

    const hasEmAssets = await tableExists(pool, "TS_OBJECT_ROOT");
    const hasMdmAssets = await tableExists(pool, "TSMDM_ASSET");

    if (hasEmAssets) {
        const hasRootId = await columnExists(pool, "TS_OBJECT_ROOT", "Object_Root_Idn");
        const hasStatus = await columnExists(pool, "TS_OBJECT_ROOT", "ConnectionStatus");
        const hasConnectionTime = await columnExists(pool, "TS_OBJECT_ROOT", "ConnectionTime");

        const connectedSql = hasStatus
            ? "SUM(CASE WHEN ISNULL(TRY_CONVERT(INT, ConnectionStatus), 0) = 1 THEN 1 ELSE 0 END)"
            : "CAST(0 AS INT)";

        const disconnectedSql = hasStatus
            ? "SUM(CASE WHEN ISNULL(TRY_CONVERT(INT, ConnectionStatus), 0) <> 1 THEN 1 ELSE 0 END)"
            : "CAST(0 AS INT)";

        const attentionSql = hasConnectionTime
            ? "SUM(CASE WHEN ConnectionTime IS NULL OR ConnectionTime < DATEADD(DAY, -30, GETDATE()) THEN 1 ELSE 0 END)"
            : "CAST(0 AS INT)";

        const latestSql = hasConnectionTime
            ? "MAX(ConnectionTime)"
            : "CAST(NULL AS DATETIME)";

        const whereSql = hasRootId
            ? "WHERE ISNULL(Object_Root_Idn, 0) > 0"
            : "";

        const result = await pool.request().query(`
            SELECT
                COUNT(1) AS totalEndpoints,
                ${connectedSql} AS connectedEndpoints,
                ${disconnectedSql} AS disconnectedEndpoints,
                ${attentionSql} AS attentionNeeded,
                ${latestSql} AS latestConnection
            FROM TS_OBJECT_ROOT WITH (NOLOCK)
            ${whereSql};
        `);

        const row = result.recordset?.[0] || {};

        summary.totalEndpoints += toNumber(row.totalEndpoints);
        summary.connectedEndpoints += toNumber(row.connectedEndpoints);
        summary.disconnectedEndpoints += toNumber(row.disconnectedEndpoints);
        summary.attentionNeeded += toNumber(row.attentionNeeded);
        summary.latestConnection = row.latestConnection || summary.latestConnection;
    }

    if (hasMdmAssets) {
        const hasId = await columnExists(pool, "TSMDM_ASSET", "MDM_Asset_Idn");
        const hasStatus = await columnExists(pool, "TSMDM_ASSET", "ConnectionStatus");
        const hasTime = await columnExists(pool, "TSMDM_ASSET", "DeviceTimeStamp");

        const statusText = "LOWER(CONVERT(NVARCHAR(100), ConnectionStatus))";

        const connectedSql = hasStatus
            ? `SUM(CASE WHEN TRY_CONVERT(INT, ConnectionStatus) = 1 OR ${statusText} IN ('online', 'connected', 'active') THEN 1 ELSE 0 END)`
            : "CAST(0 AS INT)";

        const disconnectedSql = hasStatus
            ? `SUM(CASE WHEN NOT (TRY_CONVERT(INT, ConnectionStatus) = 1 OR ${statusText} IN ('online', 'connected', 'active')) THEN 1 ELSE 0 END)`
            : "CAST(0 AS INT)";

        const attentionSql = hasTime
            ? "SUM(CASE WHEN DeviceTimeStamp IS NULL OR DeviceTimeStamp < DATEADD(DAY, -30, GETDATE()) THEN 1 ELSE 0 END)"
            : "CAST(0 AS INT)";

        const latestSql = hasTime
            ? "MAX(DeviceTimeStamp)"
            : "CAST(NULL AS DATETIME)";

        const whereSql = hasId
            ? "WHERE ISNULL(MDM_Asset_Idn, 0) > 0"
            : "";

        const result = await pool.request().query(`
            SELECT
                COUNT(1) AS totalEndpoints,
                ${connectedSql} AS connectedEndpoints,
                ${disconnectedSql} AS disconnectedEndpoints,
                ${attentionSql} AS attentionNeeded,
                ${latestSql} AS latestConnection
            FROM TSMDM_ASSET WITH (NOLOCK)
            ${whereSql};
        `);

        const row = result.recordset?.[0] || {};

        summary.totalEndpoints += toNumber(row.totalEndpoints);
        summary.connectedEndpoints += toNumber(row.connectedEndpoints);
        summary.disconnectedEndpoints += toNumber(row.disconnectedEndpoints);
        summary.attentionNeeded += toNumber(row.attentionNeeded);

        if (!summary.latestConnection || new Date(row.latestConnection) > new Date(summary.latestConnection)) {
            summary.latestConnection = row.latestConnection || summary.latestConnection;
        }
    }

    return {
        ...summary,
        connectedRate: percent(summary.connectedEndpoints, summary.totalEndpoints),
        attentionRate: percent(summary.attentionNeeded, summary.totalEndpoints),
    };
}

async function getSettingsChanges(pool) {
    const hasAudit = await tableExists(pool, "EMA_AuditLogs");

    if (!hasAudit) {
        return [];
    }

    const hasModule = await columnExists(pool, "EMA_AuditLogs", "Module");
    const hasAction = await columnExists(pool, "EMA_AuditLogs", "Action");
    const hasSeverity = await columnExists(pool, "EMA_AuditLogs", "Severity");
    const hasCreatedAt = await columnExists(pool, "EMA_AuditLogs", "CreatedAt");

    if (!hasCreatedAt) {
        return [];
    }

    const moduleSql = hasModule ? "COALESCE(NULLIF(Module, ''), 'System')" : "'System'";
    const actionSql = hasAction ? "COALESCE(NULLIF(Action, ''), 'Updated setting')" : "'Updated setting'";
    const severitySql = hasSeverity ? "COALESCE(NULLIF(Severity, ''), 'Info')" : "'Info'";

    const result = await pool.request().query(`
        SELECT TOP 8
            ${moduleSql} AS area,
            ${actionSql} AS activity,
            ${severitySql} AS priority,
            CreatedAt AS activityTime
        FROM EMA_AuditLogs WITH (NOLOCK)
        WHERE CreatedAt >= DATEADD(DAY, -14, GETDATE())
        ORDER BY CreatedAt DESC;
    `);

    return (result.recordset || []).map((row) => ({
        area: cleanText(row.area) || "System",
        activity: cleanText(row.activity) || "Updated setting",
        priority: cleanText(row.priority) || "Info",
        time: dateLabel(row.activityTime),
    }));
}

function buildEndpointAnswer(data) {
    return [
        `Endpoint health summary: ${data.totalEndpoints} endpoints are recorded.`,
        `${data.connectedEndpoints} endpoints are connected and ${data.disconnectedEndpoints} are not connected.`,
        `${data.attentionNeeded} endpoints need review. Connected rate is ${data.connectedRate}.`,
        `Latest recorded connection: ${dateLabel(data.latestConnection)}.`
    ].join("\n");
}

function buildRiskAnswer(data) {
    if (data.totalEndpoints <= 0) {
        return "Risk review summary: no endpoint data is available yet.";
    }

    return [
        `Risk review summary: ${data.attentionNeeded} of ${data.totalEndpoints} endpoints need attention.`,
        `Attention rate is ${data.attentionRate}.`,
        data.attentionNeeded > 0
            ? "Recommended focus: review endpoints with missing or aging connection records."
            : "No major endpoint aging risk was detected from the available summary."
    ].join("\n");
}

function buildPatchAnswer() {
    return [
        "Patch risk summary is available only after an approved patch summary source is connected.",
        "Friday is currently limited to endpoint health, risk review, and settings change summaries."
    ].join("\n");
}

function buildSettingsAnswer(changes) {
    if (!changes.length) {
        return "No recent settings changes are available from the approved audit summary.";
    }

    const lines = changes.map((item, index) => (
        `${index + 1}. ${item.area}: ${item.activity} (${item.priority}) - ${item.time}`
    ));

    return `Recent settings changes:\n${lines.join("\n")}`;
}

async function buildLiveAnswer(message) {
    const intent = resolveIntent(message);
    const pool = await getPool();

    if (intent === "endpoint_health") {
        const health = await getEndpointHealth(pool);
        return buildEndpointAnswer(health);
    }

    if (intent === "risk_review") {
        const health = await getEndpointHealth(pool);
        return buildRiskAnswer(health);
    }

    if (intent === "settings_changes") {
        const changes = await getSettingsChanges(pool);
        return buildSettingsAnswer(changes);
    }

    if (intent === "patch_risks") {
        return buildPatchAnswer();
    }

    return [
        "Friday is online.",
        "You can ask about endpoint health, risk review, patch risks, or recent settings changes."
    ].join("\n");
}

router.get("/health", async (req, res) => {
    return res.status(200).json({
        success: true,
        service: "Friday AI Assist",
        status: "online",
        version: ROUTE_VERSION,
        databaseConfigured: Boolean(
            process.env.DB_USER &&
            process.env.DB_PASSWORD &&
            process.env.DB_SERVER &&
            process.env.DB_NAME
        ),
        timestamp: new Date().toISOString(),
    });
});

router.post("/", async (req, res) => {
    try {
        const message = cleanText(
            req.body?.message ||
            req.body?.prompt ||
            req.body?.question ||
            ""
        );

        const answer = await buildLiveAnswer(message);

        return res.status(200).json({
            success: true,
            answer,
            data: {
                version: ROUTE_VERSION,
            },
        });
    } catch (error) {
        console.error("Friday AI Assist error:", {
            message: error.message,
            code: error.code,
            detail: error.originalError?.info?.message || null,
        });

        return res.status(200).json({
            success: true,
            answer: "Friday is connected, but the live operational summary is unavailable right now. Please check the backend console for details.",
            data: {
                version: ROUTE_VERSION,
                error: process.env.AI_ASSIST_DEBUG === "true" ? {
                    message: error.message,
                    code: error.code || null,
                    detail: error.originalError?.info?.message || null,
                } : undefined,
            },
        });
    }
});

module.exports = router;
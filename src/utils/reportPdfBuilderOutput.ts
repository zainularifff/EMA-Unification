import { buildLegacyReportHtml } from "./reportPdfLegacyDesign";
import { buildExecutiveLegacyReportHtml } from "./reportPdfExecutiveDesign";

const EXECUTIVE_REPORT_IDS = new Set(["ai-executive-summary", "executive-summary"]);

export function buildBuilderReportHtml(payload: any, filters: any, options: any = {}) {
  const id = String(payload?.report?.id || payload?.filters?.reportId || "").toLowerCase();
  const executive = EXECUTIVE_REPORT_IDS.has(id);
  return executive ? buildExecutiveLegacyReportHtml(payload, filters, options) : buildLegacyReportHtml(payload, filters, options);
}

import { useEffect } from "react";
import "../styles/report-builder-canvas-center.css";
import { installReportDateRangeEnhancer } from "../utils/reportDateRangeEnhancer";
import ReportBuilderRulesClean from "./ReportBuilderRulesClean";

export default function ReportBoard() {
  useEffect(() => installReportDateRangeEnhancer(), []);
  return <ReportBuilderRulesClean />;
}

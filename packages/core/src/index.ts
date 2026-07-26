export { runAudit } from "./audit.js";
export { runDoctor } from "./doctor.js";
export {
  redactSensitiveText,
  restoreRedactedText,
  type RedactionFinding,
  type RedactionResult,
} from "./privacy.js";
export { analyzeFile, RULES } from "./rules.js";
export {
  readProjectFile,
  scanProject,
  type ScanOptions,
} from "./scanner.js";
export type {
  AuditFinding,
  AuditReport,
  AuditScores,
  DoctorCheck,
  DoctorReport,
  FindingCategory,
  FindingSeverity,
  ProjectFile,
  ProjectScan,
} from "./types.js";

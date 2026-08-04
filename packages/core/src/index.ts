export { runAudit } from "./audit.js";
export { runDoctor } from "./doctor.js";
export {
  generateWithLMStudio,
  listLMStudioModels,
  LMStudioError,
  type LMStudioGenerateOptions,
  type LMStudioGenerateResult,
  type LMStudioModel,
} from "./lmstudio.js";
export {
  applyChangePlan,
  ChangePlanError,
  createChangePlan,
  listChangeSessions,
  parseChangePlan,
  previewChangePlan,
  sha256,
  undoChangeSession,
  type ApplyChangeResult,
  type ChangeFilePreview,
  type ChangePlan,
  type ChangePlanFile,
  type ChangePreview,
  type ChangeSessionEntry,
  type ChangeSessionManifest,
  type UndoChangeResult,
} from "./changes.js";
export { unifiedDiff, type UnifiedDiffResult } from "./diff.js";
export {
  prepareProjectContext,
  type ContextFilePreview,
  type ContextPreview,
  type ContextRedactionSummary,
  type PreparedContext,
  type PrepareContextOptions,
} from "./context.js";
export {
  generateWithOllama,
  listOllamaModels,
  OllamaError,
  type FetchImplementation,
  type OllamaGenerateOptions,
  type OllamaGenerateResult,
  type OllamaModel,
} from "./ollama.js";
export {
  generateWithLocalModel,
  listLocalModels,
  parseLocalModelProvider,
  type LocalGenerateOptions,
  type LocalGenerateResult,
  type LocalModel,
  type LocalModelProvider,
  type LocalProviderOptions,
} from "./providers.js";
export {
  CHANGE_PROPOSAL_SCHEMA,
  ChangeProposalError,
  proposeChangePlanWithLocalModel,
  proposeChangePlanWithOllama,
  type ProposeChangePlanOptions,
  type ProposedChangePlan,
} from "./proposals.js";
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

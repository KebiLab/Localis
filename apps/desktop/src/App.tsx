import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useMemo, useState } from "react";

import type {
  AskResponse,
  AuditFinding,
  AuditReport,
  Operation,
  PrivacyReport,
  ProviderModel,
  ProviderModelsResponse,
  ProviderSettings,
  ShipReport,
  WorkspaceReport,
} from "./types";
import { UI_COPY, type Language, type ThemePreference, type UiCopy } from "./i18n";

const OPERATION_IDS: Operation[] = ["audit", "privacy", "ship"];

type WorkspaceView = Operation | "ai" | "settings";
type ProviderPreset = ProviderSettings["preset"];

const PROVIDER_STORAGE_KEY = "localis.provider.v1";
const PREFERENCES_STORAGE_KEY = "localis.preferences.v1";
const PROVIDER_PRESETS: Record<ProviderPreset, Omit<ProviderSettings, "model">> = {
  ollama: { preset: "ollama", connectionId: "ollama", provider: "ollama", label: "Ollama", endpoint: "http://127.0.0.1:11434" },
  lmstudio: { preset: "lmstudio", connectionId: "lmstudio", provider: "lmstudio", label: "LM Studio", endpoint: "http://127.0.0.1:1234" },
  openai: { preset: "openai", connectionId: "openai", provider: "openai-compatible", label: "OpenAI", endpoint: "https://api.openai.com/v1" },
  openrouter: { preset: "openrouter", connectionId: "openrouter", provider: "openai-compatible", label: "OpenRouter", endpoint: "https://openrouter.ai/api/v1" },
  custom: { preset: "custom", connectionId: "custom-compatible", provider: "openai-compatible", label: "Custom API", endpoint: "" },
};

function loadProviderSettings(): ProviderSettings {
  const fallback = { ...PROVIDER_PRESETS.ollama, model: "" };
  try {
    const saved = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (!saved) return fallback;
    const value = JSON.parse(saved) as Partial<ProviderSettings>;
    if (!value.preset || !PROVIDER_PRESETS[value.preset]) return fallback;
    const preset = PROVIDER_PRESETS[value.preset];
    return {
      ...preset,
      label: typeof value.label === "string" ? value.label.slice(0, 80) : preset.label,
      endpoint: typeof value.endpoint === "string" ? value.endpoint.slice(0, 2048) : preset.endpoint,
      model: typeof value.model === "string" ? value.model.slice(0, 500) : "",
    };
  } catch {
    return fallback;
  }
}

function saveProviderSettings(settings: ProviderSettings) {
  localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(settings));
}

function loadPreferences(): { language: Language; theme: ThemePreference } {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "{}") as { language?: unknown; theme?: unknown };
    return {
      language: saved.language === "ru" ? "ru" : "en",
      theme: saved.theme === "light" || saved.theme === "dark" ? saved.theme : "system",
    };
  } catch {
    return { language: "en", theme: "system" };
  }
}

function Logo({ onClick, homeLabel }: { onClick: () => void; homeLabel: string }) {
  return (
    <button className="brand" type="button" onClick={onClick} aria-label={homeLabel} title={homeLabel}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path className="brand-frame" d="M20 3.5 35 12.2v6.3l-4.5-2.6v-1.1L20 8.7 9.5 14.8v12.4L20 33.3l10.5-6.1v-1.1l4.5-2.6v6.3l-15 8.7L5 29.8V12.2L20 3.5Z" />
        <path className="brand-letter" d="m13.4 15 5.1-3v11.5l8.2 4.8-4.7 2.7-8.6-5V15Z" />
      </svg>
      <span>Localis</span>
    </button>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.75 6.75h6l1.7 2h8.8v9.5a2 2 0 0 1-2 2H5.75a2 2 0 0 1-2-2V6.75Z" />
      <path d="M3.75 9h16.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m7.5 4.5 5.5 5.5-5.5 5.5" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="chevron-down" viewBox="0 0 20 20" aria-hidden="true">
      <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4.5" y="8.5" width="11" height="8" rx="2" />
      <path d="M7 8.5V6.4a3 3 0 0 1 6 0v2.1M10 11.5v2" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 2.5c.5 4.2 2.1 5.8 6.3 6.3-4.2.5-5.8 2.1-6.3 6.3-.5-4.2-2.1-5.8-6.3-6.3C7.9 8.3 9.5 6.7 10 2.5Z" />
    </svg>
  );
}

function StatusIcon({ tone = "good" }: { tone?: "good" | "warning" | "info" }) {
  return (
    <span className={`status-icon ${tone}`} aria-hidden="true">
      {tone === "good" ? "✓" : tone === "warning" ? "!" : "i"}
    </span>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  return (
    <div className="score-ring" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}>
      <div>
        <strong>{score}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function EmptyState({ operation, onChoose, text }: { operation: Operation; onChoose: () => void; text: UiCopy }) {
  const copy = text.empty[operation];

  return (
    <section className="empty-layout">
      <div className="empty-copy">
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <button className="secondary-button" onClick={onChoose}>
          <FolderIcon />
          {text.common.chooseProject}
        </button>
        <div className="maker-credit">
          <span>{text.common.madeBy}</span>
          <strong>KebiLab</strong>
        </div>
      </div>
      <div className="empty-preview card" aria-hidden="true">
        <div className="preview-head"><i /><i /><i /></div>
        <div className="preview-score"><span>LOCAL</span><strong>—</strong></div>
        <div className="preview-lines"><i /><i /><i /><i /></div>
        <div className="preview-proof"><StatusIcon /><span>{text.common.noTelemetry}</span></div>
      </div>
    </section>
  );
}

function FindingRow({ finding, text }: { finding: AuditFinding; text: UiCopy }) {
  const [expanded, setExpanded] = useState(false);
  const tone = finding.severity === "critical" || finding.severity === "high" ? "warning" : "info";

  return (
    <article className={`finding-row ${expanded ? "expanded" : ""}`}>
      <button onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <StatusIcon tone={tone} />
        <span className="finding-copy">
          <strong>{finding.title}</strong>
          <code>{finding.file}:{finding.line}</code>
        </span>
        <span className={`severity ${finding.severity}`}>{finding.severity}</span>
        <ArrowIcon />
      </button>
      {expanded && (
        <div className="finding-detail">
          <p>{finding.description}</p>
          <strong>{text.common.suggestedFix}</strong>
          <p>{finding.remediation}</p>
          <code>{finding.ruleId}</code>
        </div>
      )}
    </article>
  );
}

function AuditView({ report, text }: { report: AuditReport; text: UiCopy }) {
  const passed = Math.max(0, report.scannedFiles - report.findings.length);

  return (
    <div className="dashboard-grid">
      <section className="overview card">
        <div className="section-heading">
          <h1>{text.audit.overall}</h1>
          <span className="quiet-label">{report.scannedFiles} {text.audit.files}</span>
        </div>
        <ScoreRing score={report.scores.overall} label={report.scores.overall >= 80 ? text.audit.good : text.audit.needsReview} />
        <div className="metric-list">
          <div><StatusIcon /><span>{text.audit.passedChecks}</span><strong>{passed}</strong></div>
          <div><StatusIcon tone="warning" /><span>{text.audit.highPriority}</span><strong>{report.summary.critical + report.summary.high}</strong></div>
          <div><StatusIcon tone="info" /><span>{text.audit.otherFindings}</span><strong>{report.summary.medium + report.summary.low}</strong></div>
        </div>
      </section>

      <section className="results card">
        <div className="section-heading">
          <h1>{text.audit.recentFindings}</h1>
          <span className="count-badge">{report.findings.length}</span>
        </div>
        <div className="result-list">
          {report.findings.length ? report.findings.map((finding) => (
            <FindingRow key={finding.id} finding={finding} text={text} />
          )) : (
            <div className="result-empty">
              <StatusIcon />
              <strong>{text.audit.noIssue}</strong>
              <p>{text.audit.passedRules}</p>
            </div>
          )}
        </div>
      </section>

      <section className="verification-strip card">
        <div><StatusIcon /><span><strong>{text.audit.complete}</strong><small>{text.audit.unchanged}</small></span></div>
        <code>{report.durationMs} ms</code>
      </section>
    </div>
  );
}

function PrivacyView({ report, text }: { report: PrivacyReport; text: UiCopy }) {
  const preview = report.preview;
  const redactions = Object.values(preview.redactions).reduce((sum, value) => sum + value, 0);

  return (
    <div className="dashboard-grid">
      <section className="overview card privacy-overview">
        <div className="section-heading"><h1>{text.privacy.localOnly}</h1></div>
        <div className="privacy-mark"><StatusIcon /><strong>{text.privacy.privateDefault}</strong><span>{text.privacy.reviewFirst}</span></div>
        <div className="metric-list">
          <div><span>{text.privacy.files}</span><strong>{preview.files.length}</strong></div>
          <div><span>{text.privacy.payload}</span><strong>{(preview.outputBytes / 1024).toFixed(1)} KiB</strong></div>
          <div><span>{text.privacy.redactions}</span><strong>{redactions}</strong></div>
        </div>
      </section>

      <section className="results card">
        <div className="section-heading">
          <h1>{text.privacy.manifest}</h1>
          <span className="count-badge">{preview.files.length}</span>
        </div>
        <div className="manifest-list">
          {preview.files.map((file) => (
            <div key={file.path}>
              <StatusIcon tone={file.redactions ? "warning" : "good"} />
              <code>{file.path}</code>
              <span>{file.redactions ? `${file.redactions} ${text.privacy.redacted}` : text.privacy.clean}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="verification-strip card">
        <div><StatusIcon /><span><strong>{text.privacy.fingerprint}</strong><small>{text.privacy.identity}</small></span></div>
        <code>sha256:{preview.payloadSha256.slice(0, 20)}…</code>
      </section>
    </div>
  );
}

function ShipView({ report, text }: { report: ShipReport; text: UiCopy }) {
  const passed = report.verification.results.filter((result) => result.status === "passed").length;

  return (
    <div className="dashboard-grid">
      <section className="overview card release-overview">
        <div className="section-heading"><h1>{report.ready ? text.ship.ready : text.ship.blocked}</h1></div>
        <div className={`release-mark ${report.ready ? "ready" : "blocked"}`}>
          <StatusIcon tone={report.ready ? "good" : "warning"} />
          <p>{report.ready ? text.ship.passed : `${report.blockers.length} ${text.ship.blocker}`}</p>
        </div>
        <div className="metric-list">
          <div><span>{text.ship.passedChecks}</span><strong>{passed}</strong></div>
          <div><span>{text.ship.blockedChecks}</span><strong>{report.verification.results.length - passed}</strong></div>
          <div><span>{text.ship.auditScore}</span><strong>{report.audit.scores.overall}</strong></div>
        </div>
      </section>

      <section className="results card">
        <div className="section-heading">
          <h1>{text.ship.releaseChecks}</h1>
          <span className="count-badge">{report.verification.results.length}</span>
        </div>
        <div className="check-list">
          {report.blockers.map((blocker) => <p className="blocker" key={blocker}>{blocker}</p>)}
          {report.verification.results.map((result) => (
            <div className="check-row" key={result.id}>
              <StatusIcon tone={result.status === "passed" ? "good" : "warning"} />
              <span><strong>{result.label}</strong><code>{result.id}</code></span>
              <time>{(result.durationMs / 1000).toFixed(1)}s</time>
            </div>
          ))}
        </div>
      </section>

      <section className="verification-strip card">
        <div><StatusIcon tone={report.ready ? "good" : "warning"} /><span><strong>{report.ready ? text.ship.verified : text.ship.action}</strong><small>{report.ready ? text.ship.safe : text.ship.resolve}</small></span></div>
        <code>{report.root}</code>
      </section>
    </div>
  );
}

function SettingsView({
  settings,
  models,
  apiKey,
  filter,
  connected,
  busy,
  error,
  text,
  language,
  theme,
  onPreset,
  onLabel,
  onEndpoint,
  onApiKey,
  onFilter,
  onModel,
  onConnect,
  onDisconnect,
  onOpenAI,
  onLanguage,
  onTheme,
}: {
  settings: ProviderSettings;
  models: ProviderModel[];
  apiKey: string;
  filter: string;
  connected: boolean;
  busy: boolean;
  error: string;
  text: UiCopy;
  language: Language;
  theme: ThemePreference;
  onPreset: (preset: ProviderPreset) => void;
  onLabel: (label: string) => void;
  onEndpoint: (endpoint: string) => void;
  onApiKey: (key: string) => void;
  onFilter: (filter: string) => void;
  onModel: (model: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onOpenAI: () => void;
  onLanguage: (language: Language) => void;
  onTheme: (theme: ThemePreference) => void;
}) {
  const visibleModels = models.filter((model) =>
    model.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  const remote = settings.provider === "openai-compatible";

  return (
    <div className="settings-layout">
      <aside className="provider-rail card">
        <div className="settings-title">
          <span>{text.settings.connections}</span>
          <strong>{text.settings.providers}</strong>
        </div>
        <div className="provider-options">
          {(Object.keys(PROVIDER_PRESETS) as ProviderPreset[]).map((preset) => {
            const item = PROVIDER_PRESETS[preset];
            return (
              <button
                className={settings.preset === preset ? "active" : ""}
                key={preset}
                onClick={() => onPreset(preset)}
              >
                <span>{item.label}</span>
                <small><i />{item.provider === "openai-compatible" ? text.settings.cloud : text.settings.device}</small>
              </button>
            );
          })}
        </div>
        <div className="provider-privacy">
          <span className="privacy-lock"><LockIcon /></span>
          <p><strong>{text.settings.keyMemory}</strong><span>{text.settings.keyCleared}</span></p>
        </div>
        <div className="app-preferences">
          <span>{text.settings.preferences}</span>
          <label>
            <span>{text.settings.language}</span>
            <select value={language} onChange={(event) => onLanguage(event.target.value as Language)}>
              <option value="en">{text.settings.english}</option>
              <option value="ru">{text.settings.russian}</option>
            </select>
          </label>
          <label>
            <span>{text.settings.theme}</span>
            <select value={theme} onChange={(event) => onTheme(event.target.value as ThemePreference)}>
              <option value="system">{text.settings.system}</option>
              <option value="light">{text.settings.light}</option>
              <option value="dark">{text.settings.dark}</option>
            </select>
          </label>
        </div>
      </aside>

      <section className="provider-settings card">
        <div className="provider-settings-head">
          <div>
            <span>{text.settings.connection}</span>
            <h1>{settings.label}</h1>
          </div>
          <div className={`connection-state ${connected ? "connected" : ""}`}>
            <i><span /></i>
            <p><strong>{connected ? text.settings.connected : text.settings.ready}</strong><small>{connected ? `${models.length} ${text.settings.modelsAvailable}` : text.settings.noRequest}</small></p>
          </div>
        </div>

        <div className="provider-form">
          {settings.preset === "custom" && (
            <label>
              <span>{text.settings.connectionName}</span>
              <input value={settings.label} maxLength={80} onChange={(event) => onLabel(event.target.value)} placeholder={text.settings.providerPlaceholder} />
            </label>
          )}
          <label className="wide-field">
            <span>{text.settings.baseUrl}</span>
            <input value={settings.endpoint} onChange={(event) => onEndpoint(event.target.value)} placeholder="https://api.provider.com/v1" spellCheck={false} />
          </label>
          {remote && (
            <label className="wide-field">
              <span>{text.settings.apiKey} <small>{text.settings.notSaved}</small></span>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => onApiKey(event.target.value)}
                placeholder={connected ? text.settings.loadedKey : text.settings.keyPlaceholder}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          )}
          <div className="provider-actions wide-field">
            <button className="connect-button" onClick={onConnect} disabled={busy || !settings.endpoint.trim()} aria-busy={busy}>{text.settings.connect}</button>
            {connected && <button className="disconnect-button" onClick={onDisconnect}>{text.settings.disconnect}</button>}
            {connected && settings.model && <button className="open-ai-button" onClick={onOpenAI}><SparkIcon />{text.settings.openAI}</button>}
          </div>
        </div>

        {error && <div className="provider-error"><strong>{text.settings.failed}</strong><span>{error}</span></div>}

        <div className="model-catalog">
          <div className="model-catalog-head">
            <div><span>{text.settings.catalog}</span><strong>{models.length} {text.settings.models}</strong></div>
            <input value={filter} onChange={(event) => onFilter(event.target.value)} placeholder={text.settings.filter} disabled={!models.length} />
          </div>
          <div className="model-list">
            {visibleModels.length ? visibleModels.map((model) => (
              <button className={settings.model === model.name ? "selected" : ""} key={model.name} onClick={() => onModel(model.name)}>
                <span><strong>{model.name}</strong><small>{model.ownedBy ?? text.settings.available}</small></span>
                <i>{settings.model === model.name ? "✓" : ""}</i>
              </button>
            )) : (
              <div className="model-empty">
                <span className="catalog-mark"><SparkIcon /></span>
                <div>
                  <strong>{models.length ? text.settings.noMatches : text.settings.empty}</strong>
                  <span>{models.length ? text.settings.shorter : `${text.settings.connectNamed} ${settings.label} ${text.settings.connectToLoad}`}</span>
                </div>
                {!models.length && <code>GET /models</code>}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function AIView({
  project,
  settings,
  connected,
  question,
  answer,
  busy,
  error,
  text,
  onQuestion,
  onAsk,
  onChooseProject,
  onOpenSettings,
}: {
  project: string;
  settings: ProviderSettings;
  connected: boolean;
  question: string;
  answer: AskResponse | null;
  busy: boolean;
  error: string;
  text: UiCopy;
  onQuestion: (value: string) => void;
  onAsk: () => void;
  onChooseProject: () => void;
  onOpenSettings: () => void;
}) {
  if (!connected || !settings.model) {
    return (
      <div className="ai-onboarding card">
        <div className="ai-mark"><SparkIcon /></div>
        <h1>{text.ai.connectTitle}</h1>
        <p>{text.ai.connectBody}</p>
        <button className="secondary-button" onClick={onOpenSettings}><GearIcon />{text.ai.openSettings}</button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="ai-onboarding card">
        <div className="ai-mark"><FolderIcon /></div>
        <h1>{text.ai.chooseTitle}</h1>
        <p>{text.ai.projectNeeded} {settings.label}.</p>
        <button className="secondary-button" onClick={onChooseProject}><FolderIcon />{text.common.chooseProject}</button>
      </div>
    );
  }

  const redactions = answer
    ? Object.values(answer.preview.redactions).reduce((total, value) => total + value, 0)
    : 0;

  return (
    <div className="ai-layout">
      <aside className="ai-context card">
        <div className="settings-title"><span>{text.ai.active}</span><strong>{settings.label}</strong></div>
        <dl>
          <div><dt>{text.ai.model}</dt><dd>{settings.model}</dd></div>
          <div><dt>{text.ai.endpoint}</dt><dd>{settings.endpoint}</dd></div>
          <div><dt>{text.ai.contextFiles}</dt><dd>{answer?.preview.files.length ?? "—"}</dd></div>
          <div><dt>{text.ai.redactions}</dt><dd>{answer ? redactions : "—"}</dd></div>
        </dl>
        <div className="context-note"><StatusIcon /><p><strong>{text.ai.preview}</strong><span>{text.ai.redacted}</span></p></div>
        <button className="quiet-button" onClick={onOpenSettings}><GearIcon />{text.ai.changeProvider}</button>
      </aside>

      <section className="ai-chat card">
        <div className="ai-chat-head">
          <div><span>{text.ai.answer}</span><h1>{text.ai.askTitle}</h1></div>
          {answer && <code>{answer.result.model}</code>}
        </div>
        <div className="ai-answer">
          {answer ? (
            <div className="answer-copy">{answer.result.response}</div>
          ) : (
            <div className="answer-empty"><SparkIcon /><strong>{text.ai.empty}</strong><span>{text.ai.bounded}</span></div>
          )}
        </div>
        {error && <div className="provider-error"><strong>{text.ai.failed}</strong><span>{error}</span></div>}
        <div className="prompt-box">
          <textarea
            value={question}
            onChange={(event) => onQuestion(event.target.value)}
            placeholder={text.ai.placeholder}
            maxLength={4000}
          />
          <div><span>{question.length}/4000</span><button onClick={onAsk} disabled={busy || !question.trim()}><SparkIcon />{busy ? text.ai.thinking : text.ai.ask}</button></div>
        </div>
      </section>
    </div>
  );
}

export function App() {
  const [project, setProject] = useState("");
  const [view, setView] = useState<WorkspaceView>("audit");
  const [operation, setOperation] = useState<Operation>("audit");
  const [report, setReport] = useState<WorkspaceReport | null>(null);
  const [reportType, setReportType] = useState<Operation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [providerSettings, setProviderSettings] = useState<ProviderSettings>(loadProviderSettings);
  const [providerModels, setProviderModels] = useState<ProviderModel[]>([]);
  const [providerKey, setProviderKey] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [providerConnected, setProviderConnected] = useState(false);
  const [providerBusy, setProviderBusy] = useState(false);
  const [providerError, setProviderError] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [askBusy, setAskBusy] = useState(false);
  const [askError, setAskError] = useState("");
  const [preferences, setPreferences] = useState(loadPreferences);

  const text = UI_COPY[preferences.language];
  const projectName = useMemo(() => project.split(/[\\/]/).filter(Boolean).at(-1) ?? text.common.workspace, [project, text.common.workspace]);
  const activeReport = reportType === operation ? report : null;

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.lang = preferences.language;
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      document.documentElement.dataset.colorScheme = preferences.theme === "system"
        ? media.matches ? "dark" : "light"
        : preferences.theme;
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [preferences]);

  async function chooseProject() {
    const selected = await open({ directory: true, multiple: false, title: text.common.openRepository });
    if (typeof selected === "string") {
      setProject(selected);
      setReport(null);
      setReportType(null);
      setError("");
    }
  }

  async function run() {
    if (!project.trim()) {
      setError(text.errors.chooseFirst);
      return;
    }
    setView(operation);
    setBusy(true);
    setError("");
    try {
      const result = await invoke<WorkspaceReport>("run_localis", { project, operation });
      setReport(result);
      setReportType(operation);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }

  function selectProviderPreset(preset: ProviderPreset) {
    void invoke("forget_provider_secret", { connectionId: providerSettings.connectionId }).catch(() => undefined);
    const next = { ...PROVIDER_PRESETS[preset], model: "" };
    setProviderSettings(next);
    saveProviderSettings(next);
    setProviderModels([]);
    setProviderKey("");
    setProviderFilter("");
    setProviderConnected(false);
    setProviderError("");
    setAnswer(null);
  }

  function updateProviderSettings(patch: Partial<ProviderSettings>) {
    if (providerConnected) {
      void invoke("forget_provider_secret", { connectionId: providerSettings.connectionId }).catch(() => undefined);
    }
    const next = { ...providerSettings, ...patch };
    setProviderSettings(next);
    saveProviderSettings(next);
    setProviderConnected(false);
    setProviderModels([]);
    setProviderError("");
    setAnswer(null);
  }

  async function connectProvider() {
    setProviderBusy(true);
    setProviderError("");
    try {
      const response = await invoke<ProviderModelsResponse>("discover_provider_models", {
        connectionId: providerSettings.connectionId,
        provider: providerSettings.provider,
        endpoint: providerSettings.endpoint,
        apiKey: providerKey.trim() || null,
      });
      const models = [...response.models].sort((left, right) => left.name.localeCompare(right.name));
      const selected = models.some((model) => model.name === providerSettings.model)
        ? providerSettings.model
        : models[0]?.name ?? "";
      const next = { ...providerSettings, model: selected };
      setProviderSettings(next);
      saveProviderSettings(next);
      setProviderModels(models);
      setProviderConnected(true);
      setProviderKey("");
      setProviderFilter("");
    } catch (cause) {
      setProviderConnected(false);
      setProviderModels([]);
      setProviderError(String(cause));
    } finally {
      setProviderBusy(false);
    }
  }

  async function disconnectProvider() {
    await invoke("forget_provider_secret", { connectionId: providerSettings.connectionId }).catch(() => undefined);
    const next = { ...providerSettings, model: "" };
    setProviderSettings(next);
    saveProviderSettings(next);
    setProviderModels([]);
    setProviderConnected(false);
    setProviderKey("");
    setProviderError("");
    setAnswer(null);
  }

  function selectProviderModel(model: string) {
    const next = { ...providerSettings, model };
    setProviderSettings(next);
    saveProviderSettings(next);
    setAnswer(null);
  }

  async function askAI() {
    if (!project || !providerConnected || !providerSettings.model || !question.trim()) return;
    setAskBusy(true);
    setAskError("");
    try {
      const result = await invoke<AskResponse>("ask_provider", {
        connectionId: providerSettings.connectionId,
        project,
        question,
        provider: providerSettings.provider,
        endpoint: providerSettings.endpoint,
        model: providerSettings.model,
      });
      setAnswer(result);
    } catch (cause) {
      setAskError(String(cause));
    } finally {
      setAskBusy(false);
    }
  }

  function goHome() {
    setOperation("audit");
    setView("audit");
    setReport(null);
    setReportType(null);
    setError("");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Logo onClick={goHome} homeLabel={text.operations.audit.label} />
        <button className="project-picker" onClick={chooseProject} title={project || text.common.chooseRepository}>
          <FolderIcon />
          <span>{projectName}</span>
          <ChevronDownIcon />
        </button>
        <nav className="operation-tabs" aria-label={text.common.workspaceTools}>
          {OPERATION_IDS.map((id) => (
            <button
              aria-current={operation === id ? "page" : undefined}
              className={operation === id ? "active" : ""}
              key={id}
              onClick={() => { setOperation(id); setView(id); setError(""); setAskError(""); }}
              title={text.operations[id].description}
            >
              {text.operations[id].label}
            </button>
          ))}
        </nav>
        <div className={`local-status ${providerConnected && providerSettings.provider === "openai-compatible" ? "cloud" : ""}`}>
          <i /><span>{providerConnected ? providerSettings.label : text.common.localMachine}</span>
        </div>
        <button
          className={`settings-button ${view === "settings" ? "active" : ""}`}
          onClick={() => { setView("settings"); setError(""); }}
          aria-label={text.common.settings}
          title={text.common.settings}
        ><GearIcon /></button>
        <button className="run-button" onClick={run} disabled={busy || !project.trim()}>
          {busy ? text.common.running : text.common.run[operation]}
        </button>
      </header>

      <section className="workspace">
        {view === "settings" ? (
          <SettingsView
            settings={providerSettings}
            models={providerModels}
            apiKey={providerKey}
            filter={providerFilter}
            connected={providerConnected}
            busy={providerBusy}
            error={providerError}
            text={text}
            language={preferences.language}
            theme={preferences.theme}
            onPreset={selectProviderPreset}
            onLabel={(label) => updateProviderSettings({ label })}
            onEndpoint={(endpoint) => updateProviderSettings({ endpoint })}
            onApiKey={setProviderKey}
            onFilter={setProviderFilter}
            onModel={selectProviderModel}
            onConnect={connectProvider}
            onDisconnect={disconnectProvider}
            onOpenAI={() => setView("ai")}
            onLanguage={(language) => setPreferences((current) => ({ ...current, language }))}
            onTheme={(theme) => setPreferences((current) => ({ ...current, theme }))}
          />
        ) : view === "ai" ? (
          <AIView
            project={project}
            settings={providerSettings}
            connected={providerConnected}
            question={question}
            answer={answer}
            busy={askBusy}
            error={askError}
            text={text}
            onQuestion={setQuestion}
            onAsk={askAI}
            onChooseProject={chooseProject}
            onOpenSettings={() => setView("settings")}
          />
        ) : (
          <>
            {error && <div className="error-banner"><strong>{text.errors.runFailed}</strong><span>{error}</span></div>}
            {!activeReport ? (
              <EmptyState operation={operation} onChoose={chooseProject} text={text} />
            ) : operation === "audit" ? (
              <AuditView report={activeReport as AuditReport} text={text} />
            ) : operation === "privacy" ? (
              <PrivacyView report={activeReport as PrivacyReport} text={text} />
            ) : (
              <ShipView report={activeReport as ShipReport} text={text} />
            )}
          </>
        )}
      </section>
    </main>
  );
}

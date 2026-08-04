import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useMemo, useState } from "react";

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

const operations: Array<{ id: Operation; label: string; description: string }> = [
  { id: "audit", label: "Audit", description: "Code and security findings" },
  { id: "privacy", label: "Privacy", description: "Review the outbound boundary" },
  { id: "ship", label: "Ship", description: "Run every release check" },
];

type WorkspaceView = Operation | "ai" | "settings";
type ProviderPreset = ProviderSettings["preset"];

const PROVIDER_STORAGE_KEY = "localis.provider.v1";
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

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button className="brand" type="button" onClick={onClick} aria-label="Go to Audit home" title="Go to Audit home">
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

function PlayIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="m7 5 7 5-7 5V5Z" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4" />
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

function EmptyState({ operation, onChoose }: { operation: Operation; onChoose: () => void }) {
  const copy = {
    audit: {
      eyebrow: "Project health",
      title: "Start with the facts.",
      body: "Choose a repository and run a local audit. Localis will show the evidence without changing your files.",
    },
    privacy: {
      eyebrow: "Outbound boundary",
      title: "See exactly what leaves.",
      body: "Preview the files, redactions, and payload fingerprint before any local model request is prepared.",
    },
    ship: {
      eyebrow: "Release readiness",
      title: "Check before you ship.",
      body: "Run the checks already declared by the repository and review every blocker in one place.",
    },
  }[operation];

  return (
    <section className="empty-layout">
      <div className="empty-copy">
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <button className="secondary-button" onClick={onChoose}>
          <FolderIcon />
          Choose project
        </button>
        <div className="maker-credit">
          <span>Made by</span>
          <strong>KebiLab</strong>
        </div>
      </div>
      <div className="empty-preview card" aria-hidden="true">
        <div className="preview-head"><i /><i /><i /></div>
        <div className="preview-score"><span>LOCAL</span><strong>—</strong></div>
        <div className="preview-lines"><i /><i /><i /><i /></div>
        <div className="preview-proof"><StatusIcon /><span>No telemetry</span></div>
      </div>
    </section>
  );
}

function FindingRow({ finding }: { finding: AuditFinding }) {
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
          <strong>Suggested fix</strong>
          <p>{finding.remediation}</p>
          <code>{finding.ruleId}</code>
        </div>
      )}
    </article>
  );
}

function AuditView({ report }: { report: AuditReport }) {
  const passed = Math.max(0, report.scannedFiles - report.findings.length);

  return (
    <div className="dashboard-grid">
      <section className="overview card">
        <div className="section-heading">
          <h1>Overall</h1>
          <span className="quiet-label">{report.scannedFiles} files</span>
        </div>
        <ScoreRing score={report.scores.overall} label={report.scores.overall >= 80 ? "Good" : "Needs review"} />
        <div className="metric-list">
          <div><StatusIcon /><span>Passed checks</span><strong>{passed}</strong></div>
          <div><StatusIcon tone="warning" /><span>High priority</span><strong>{report.summary.critical + report.summary.high}</strong></div>
          <div><StatusIcon tone="info" /><span>Other findings</span><strong>{report.summary.medium + report.summary.low}</strong></div>
        </div>
      </section>

      <section className="results card">
        <div className="section-heading">
          <h1>Recent findings</h1>
          <span className="count-badge">{report.findings.length}</span>
        </div>
        <div className="result-list">
          {report.findings.length ? report.findings.map((finding) => (
            <FindingRow key={finding.id} finding={finding} />
          )) : (
            <div className="result-empty">
              <StatusIcon />
              <strong>No deterministic issue found</strong>
              <p>The repository passed every enabled audit rule.</p>
            </div>
          )}
        </div>
      </section>

      <section className="verification-strip card">
        <div><StatusIcon /><span><strong>Local analysis complete</strong><small>No source file was changed</small></span></div>
        <code>{report.durationMs} ms</code>
      </section>
    </div>
  );
}

function PrivacyView({ report }: { report: PrivacyReport }) {
  const preview = report.preview;
  const redactions = Object.values(preview.redactions).reduce((sum, value) => sum + value, 0);

  return (
    <div className="dashboard-grid">
      <section className="overview card privacy-overview">
        <div className="section-heading"><h1>Local only</h1></div>
        <div className="privacy-mark"><StatusIcon /><strong>Private by default</strong><span>Review before anything leaves your machine.</span></div>
        <div className="metric-list">
          <div><span>Files</span><strong>{preview.files.length}</strong></div>
          <div><span>Payload</span><strong>{(preview.outputBytes / 1024).toFixed(1)} KiB</strong></div>
          <div><span>Redactions</span><strong>{redactions}</strong></div>
        </div>
      </section>

      <section className="results card">
        <div className="section-heading">
          <h1>Outbound manifest</h1>
          <span className="count-badge">{preview.files.length}</span>
        </div>
        <div className="manifest-list">
          {preview.files.map((file) => (
            <div key={file.path}>
              <StatusIcon tone={file.redactions ? "warning" : "good"} />
              <code>{file.path}</code>
              <span>{file.redactions ? `${file.redactions} redacted` : "clean"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="verification-strip card">
        <div><StatusIcon /><span><strong>Payload fingerprint</strong><small>Exact content identity</small></span></div>
        <code>sha256:{preview.payloadSha256.slice(0, 20)}…</code>
      </section>
    </div>
  );
}

function ShipView({ report }: { report: ShipReport }) {
  const passed = report.verification.results.filter((result) => result.status === "passed").length;

  return (
    <div className="dashboard-grid">
      <section className="overview card release-overview">
        <div className="section-heading"><h1>{report.ready ? "Ready to ship" : "Ship blocked"}</h1></div>
        <div className={`release-mark ${report.ready ? "ready" : "blocked"}`}>
          <StatusIcon tone={report.ready ? "good" : "warning"} />
          <p>{report.ready ? "Every discovered gate passed." : `${report.blockers.length} blocker(s) need attention.`}</p>
        </div>
        <div className="metric-list">
          <div><span>Passed checks</span><strong>{passed}</strong></div>
          <div><span>Blocked checks</span><strong>{report.verification.results.length - passed}</strong></div>
          <div><span>Audit score</span><strong>{report.audit.scores.overall}</strong></div>
        </div>
      </section>

      <section className="results card">
        <div className="section-heading">
          <h1>Release checks</h1>
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
        <div><StatusIcon tone={report.ready ? "good" : "warning"} /><span><strong>{report.ready ? "Release verified" : "Action required"}</strong><small>{report.ready ? "Safe to continue" : "Resolve blockers, then run Ship again"}</small></span></div>
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
  onPreset,
  onLabel,
  onEndpoint,
  onApiKey,
  onFilter,
  onModel,
  onConnect,
  onDisconnect,
}: {
  settings: ProviderSettings;
  models: ProviderModel[];
  apiKey: string;
  filter: string;
  connected: boolean;
  busy: boolean;
  error: string;
  onPreset: (preset: ProviderPreset) => void;
  onLabel: (label: string) => void;
  onEndpoint: (endpoint: string) => void;
  onApiKey: (key: string) => void;
  onFilter: (filter: string) => void;
  onModel: (model: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const visibleModels = models.filter((model) =>
    model.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );
  const remote = settings.provider === "openai-compatible";

  return (
    <div className="settings-layout">
      <aside className="provider-rail card">
        <div className="settings-title">
          <span>AI connections</span>
          <strong>Providers</strong>
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
                <small>{item.provider === "openai-compatible" ? "API" : "Local"}</small>
              </button>
            );
          })}
        </div>
        <div className="provider-privacy">
          <StatusIcon />
          <p><strong>Session-only secret</strong><span>API keys stay in memory and clear when Localis closes.</span></p>
        </div>
      </aside>

      <section className="provider-settings card">
        <div className="provider-settings-head">
          <div>
            <span>Provider connection</span>
            <h1>{settings.label}</h1>
          </div>
          <div className={`connection-chip ${connected ? "connected" : ""}`}><i />{connected ? "Connected" : "Not connected"}</div>
        </div>

        <div className="provider-form">
          {settings.preset === "custom" && (
            <label>
              <span>Connection name</span>
              <input value={settings.label} maxLength={80} onChange={(event) => onLabel(event.target.value)} placeholder="My provider" />
            </label>
          )}
          <label className="wide-field">
            <span>Base URL</span>
            <input value={settings.endpoint} onChange={(event) => onEndpoint(event.target.value)} placeholder="https://api.provider.com/v1" spellCheck={false} />
          </label>
          {remote && (
            <label className="wide-field">
              <span>API key <small>not saved to disk</small></span>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => onApiKey(event.target.value)}
                placeholder={connected ? "Session key is loaded" : "Paste a provider API key"}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          )}
          <div className="provider-actions wide-field">
            <button className="connect-button" onClick={onConnect} disabled={busy || !settings.endpoint.trim()}>
              <SparkIcon />
              {busy ? "Loading models…" : "Connect and load models"}
            </button>
            {connected && <button className="disconnect-button" onClick={onDisconnect}>Disconnect</button>}
          </div>
        </div>

        {error && <div className="provider-error"><strong>Connection failed</strong><span>{error}</span></div>}

        <div className="model-catalog">
          <div className="model-catalog-head">
            <div><span>Discovered catalog</span><strong>{models.length} models</strong></div>
            <input value={filter} onChange={(event) => onFilter(event.target.value)} placeholder="Filter models" disabled={!models.length} />
          </div>
          <div className="model-list">
            {visibleModels.length ? visibleModels.map((model) => (
              <button className={settings.model === model.name ? "selected" : ""} key={model.name} onClick={() => onModel(model.name)}>
                <span><strong>{model.name}</strong><small>{model.ownedBy ?? "Available from provider"}</small></span>
                <i>{settings.model === model.name ? "✓" : ""}</i>
              </button>
            )) : (
              <div className="model-empty">
                <SparkIcon />
                <strong>{models.length ? "No matching model" : "Connect to discover models"}</strong>
                <span>Localis reads the provider model catalog automatically.</span>
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
  onQuestion: (value: string) => void;
  onAsk: () => void;
  onChooseProject: () => void;
  onOpenSettings: () => void;
}) {
  if (!connected || !settings.model) {
    return (
      <div className="ai-onboarding card">
        <div className="ai-mark"><SparkIcon /></div>
        <h1>Connect your AI.</h1>
        <p>Choose a provider, load its model catalog, and keep control of the exact context Localis prepares.</p>
        <button className="secondary-button" onClick={onOpenSettings}><GearIcon />Open settings</button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="ai-onboarding card">
        <div className="ai-mark"><FolderIcon /></div>
        <h1>Choose a repository.</h1>
        <p>Localis needs a project before it can prepare redacted context for {settings.label}.</p>
        <button className="secondary-button" onClick={onChooseProject}><FolderIcon />Choose project</button>
      </div>
    );
  }

  const redactions = answer
    ? Object.values(answer.preview.redactions).reduce((total, value) => total + value, 0)
    : 0;

  return (
    <div className="ai-layout">
      <aside className="ai-context card">
        <div className="settings-title"><span>Active connection</span><strong>{settings.label}</strong></div>
        <dl>
          <div><dt>Model</dt><dd>{settings.model}</dd></div>
          <div><dt>Endpoint</dt><dd>{settings.endpoint}</dd></div>
          <div><dt>Context files</dt><dd>{answer?.preview.files.length ?? "—"}</dd></div>
          <div><dt>Redactions</dt><dd>{answer ? redactions : "—"}</dd></div>
        </dl>
        <div className="context-note"><StatusIcon /><p><strong>Preview before trust</strong><span>Secrets are redacted before project context reaches the provider.</span></p></div>
        <button className="quiet-button" onClick={onOpenSettings}><GearIcon />Change provider</button>
      </aside>

      <section className="ai-chat card">
        <div className="ai-chat-head">
          <div><span>Project-aware answer</span><h1>Ask Localis</h1></div>
          {answer && <code>{answer.result.model}</code>}
        </div>
        <div className="ai-answer">
          {answer ? (
            <div className="answer-copy">{answer.result.response}</div>
          ) : (
            <div className="answer-empty"><SparkIcon /><strong>Ask about architecture, risk, or a specific file.</strong><span>Localis sends bounded, redacted context—not the entire repository.</span></div>
          )}
        </div>
        {error && <div className="provider-error"><strong>AI request failed</strong><span>{error}</span></div>}
        <div className="prompt-box">
          <textarea
            value={question}
            onChange={(event) => onQuestion(event.target.value)}
            placeholder="How does authentication work in this project?"
            maxLength={4000}
          />
          <div><span>{question.length}/4000</span><button onClick={onAsk} disabled={busy || !question.trim()}><SparkIcon />{busy ? "Thinking…" : "Ask AI"}</button></div>
        </div>
      </section>
    </div>
  );
}

export function App() {
  const [project, setProject] = useState("");
  const [view, setView] = useState<WorkspaceView>("audit");
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

  const projectName = useMemo(() => project.split(/[\\/]/).filter(Boolean).at(-1) ?? "Workspace", [project]);
  const operation = operations.some((item) => item.id === view) ? view as Operation : null;
  const activeReport = operation && reportType === operation ? report : null;

  async function chooseProject() {
    const selected = await open({ directory: true, multiple: false, title: "Open a repository in Localis" });
    if (typeof selected === "string") {
      setProject(selected);
      setReport(null);
      setReportType(null);
      setError("");
    }
  }

  async function run() {
    if (!operation || !project.trim()) {
      setError("Choose a project folder before running Localis.");
      return;
    }
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
    setView("audit");
    setReport(null);
    setReportType(null);
    setError("");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Logo onClick={goHome} />
        <button className="project-picker" onClick={chooseProject} title={project || "Choose a local repository"}>
          <FolderIcon />
          <span>{projectName}</span>
          <ChevronDownIcon />
        </button>
        <nav className="operation-tabs" aria-label="Workspace tools">
          {[...operations.slice(0, 2), { id: "ai" as const, label: "AI", description: "Ask a connected model" }, operations[2]!].map((item) => (
            <button
              aria-current={view === item.id ? "page" : undefined}
              className={view === item.id ? "active" : ""}
              key={item.id}
              onClick={() => { setView(item.id); setError(""); setAskError(""); }}
              title={item.description}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className={`local-status ${providerConnected && providerSettings.provider === "openai-compatible" ? "cloud" : ""}`}>
          <i /><span>{providerConnected ? providerSettings.label : "Local machine"}</span>
        </div>
        <button
          className={`settings-button ${view === "settings" ? "active" : ""}`}
          onClick={() => { setView("settings"); setError(""); }}
          aria-label="AI provider settings"
          title="AI provider settings"
        ><GearIcon /></button>
        {operation ? (
          <button className="run-button" onClick={run} disabled={busy || !project.trim()}>
          <PlayIcon />
          {busy ? "Running…" : `Run ${operation}`}
          </button>
        ) : <div className="run-button-placeholder" />}
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
            onPreset={selectProviderPreset}
            onLabel={(label) => updateProviderSettings({ label })}
            onEndpoint={(endpoint) => updateProviderSettings({ endpoint })}
            onApiKey={setProviderKey}
            onFilter={setProviderFilter}
            onModel={selectProviderModel}
            onConnect={connectProvider}
            onDisconnect={disconnectProvider}
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
            onQuestion={setQuestion}
            onAsk={askAI}
            onChooseProject={chooseProject}
            onOpenSettings={() => setView("settings")}
          />
        ) : (
          <>
            {error && <div className="error-banner"><strong>Localis could not run</strong><span>{error}</span></div>}
            {!activeReport ? (
              <EmptyState operation={operation!} onChoose={chooseProject} />
            ) : operation === "audit" ? (
              <AuditView report={activeReport as AuditReport} />
            ) : operation === "privacy" ? (
              <PrivacyView report={activeReport as PrivacyReport} />
            ) : (
              <ShipView report={activeReport as ShipReport} />
            )}
          </>
        )}
      </section>
    </main>
  );
}

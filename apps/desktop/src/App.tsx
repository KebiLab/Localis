import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useMemo, useState } from "react";

import type {
  AuditFinding,
  AuditReport,
  Operation,
  PrivacyReport,
  ShipReport,
  WorkspaceReport,
} from "./types";

const operations: Array<{ id: Operation; label: string; description: string }> = [
  { id: "audit", label: "Audit", description: "Code and security findings" },
  { id: "privacy", label: "Privacy", description: "Review the outbound boundary" },
  { id: "ship", label: "Ship", description: "Run every release check" },
];

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button className="brand" type="button" onClick={onClick} aria-label="Go to Audit home" title="Go to Audit home">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 3.75 33.85 11.7v16.1L20 35.75 6.15 27.8V11.7L20 3.75Z" />
        <path className="brand-letter" d="M14 12.5v14.75h12" />
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

export function App() {
  const [project, setProject] = useState("");
  const [operation, setOperation] = useState<Operation>("audit");
  const [report, setReport] = useState<WorkspaceReport | null>(null);
  const [reportType, setReportType] = useState<Operation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const projectName = useMemo(() => project.split(/[\\/]/).filter(Boolean).at(-1) ?? "Workspace", [project]);
  const activeReport = reportType === operation ? report : null;

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
    if (!project.trim()) {
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

  function goHome() {
    setOperation("audit");
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
          {operations.map((item) => (
            <button
              aria-current={operation === item.id ? "page" : undefined}
              className={operation === item.id ? "active" : ""}
              key={item.id}
              onClick={() => { setOperation(item.id); setError(""); }}
              title={item.description}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="local-status"><i /><span>Local machine</span></div>
        <button className="run-button" onClick={run} disabled={busy || !project.trim()}>
          <PlayIcon />
          {busy ? "Running…" : `Run ${operation}`}
        </button>
      </header>

      <section className="workspace">
        {error && <div className="error-banner"><strong>Localis could not run</strong><span>{error}</span></div>}
        {!activeReport ? (
          <EmptyState operation={operation} onChoose={chooseProject} />
        ) : operation === "audit" ? (
          <AuditView report={activeReport as AuditReport} />
        ) : operation === "privacy" ? (
          <PrivacyView report={activeReport as PrivacyReport} />
        ) : (
          <ShipView report={activeReport as ShipReport} />
        )}
      </section>
    </main>
  );
}

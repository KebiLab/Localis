import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useMemo, useState } from "react";

import type {
  AuditReport,
  Operation,
  PrivacyReport,
  ShipReport,
  WorkspaceReport,
} from "./types";

const operations: Array<{ id: Operation; label: string; description: string }> = [
  { id: "audit", label: "Audit", description: "Deterministic code and security findings" },
  { id: "privacy", label: "Privacy", description: "Exact redacted outbound manifest" },
  { id: "ship", label: "Ship", description: "Audit, tests, types, lint, and build" },
];

function Logo() {
  return (
    <div className="brand" aria-label="Localis">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 3.75 33.85 11.7v16.1L20 35.75 6.15 27.8V11.7L20 3.75Z" />
        <path className="brand-letter" d="M14 12.5v14.75h12" />
        <circle className="brand-node" cx="26" cy="27.25" r="2.35" />
      </svg>
      <span>Localis</span>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div className="score-ring" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}>
      <strong>{score}</strong>
      <span>overall</span>
    </div>
  );
}

function AuditView({ report }: { report: AuditReport }) {
  return (
    <div className="report-grid">
      <section className="score-panel card">
        <ScoreRing score={report.scores.overall} />
        <div className="score-breakdown">
          {(["security", "privacy", "reliability", "maintainability"] as const).map((key) => (
            <div key={key}>
              <span>{key}</span>
              <div><i style={{ width: `${report.scores[key]}%` }} /></div>
              <strong>{report.scores[key]}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="findings card">
        <div className="card-heading">
          <div><span className="kicker">Evidence ledger</span><h2>Current findings</h2></div>
          <span className="count">{report.findings.length}</span>
        </div>
        {report.findings.length === 0 ? (
          <div className="empty"><span>✓</span><strong>No deterministic rule matched.</strong><p>Localis scanned {report.scannedFiles} files in {report.durationMs} ms.</p></div>
        ) : (
          <div className="finding-list">
            {report.findings.map((finding) => (
              <article key={finding.id}>
                <span className={`severity ${finding.severity}`}>{finding.severity}</span>
                <div>
                  <h3>{finding.title}</h3>
                  <code>{finding.file}:{finding.line}:{finding.column}</code>
                  <p>{finding.remediation}</p>
                </div>
                <span className="finding-id">{finding.id}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PrivacyView({ report }: { report: PrivacyReport }) {
  const preview = report.preview;
  const redactions = Object.values(preview.redactions).reduce((sum, value) => sum + value, 0);
  return (
    <div className="report-grid">
      <section className="boundary-card card">
        <span className="kicker">Outbound boundary</span>
        <div className="boundary-visual"><div className="boundary-core">LOCAL<br />ONLY</div></div>
        <dl>
          <div><dt>Files</dt><dd>{preview.files.length}</dd></div>
          <div><dt>Payload</dt><dd>{(preview.outputBytes / 1024).toFixed(1)} KiB</dd></div>
          <div><dt>Redactions</dt><dd>{redactions}</dd></div>
        </dl>
        <code>sha256:{preview.payloadSha256.slice(0, 20)}…</code>
      </section>
      <section className="manifest card">
        <div className="card-heading"><div><span className="kicker">Privacy gateway</span><h2>Outbound manifest</h2></div></div>
        <div className="manifest-list">
          {preview.files.map((file) => (
            <div key={file.path}><code>{file.path}</code><span>{file.redactions ? `${file.redactions} redacted` : "clean"}</span></div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ShipView({ report }: { report: ShipReport }) {
  return (
    <div className="report-grid">
      <section className={`decision card ${report.ready ? "ready" : "blocked"}`}>
        <span className="kicker">Release decision</span>
        <strong>{report.ready ? "READY\nTO SHIP" : "SHIP\nBLOCKED"}</strong>
        <p>{report.ready ? "Every discovered gate passed." : `${report.blockers.length} blocker(s) need attention.`}</p>
      </section>
      <section className="checks card">
        <div className="card-heading"><div><span className="kicker">Verification rail</span><h2>Release checks</h2></div></div>
        {report.blockers.map((blocker) => <p className="blocker" key={blocker}>{blocker}</p>)}
        {report.verification.results.map((result) => (
          <div className="check" key={result.id}>
            <span className={result.status}>{result.status === "passed" ? "✓" : "×"}</span>
            <div><strong>{result.label}</strong><code>{result.id}</code></div>
            <time>{(result.durationMs / 1000).toFixed(1)}s</time>
          </div>
        ))}
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

  const projectName = useMemo(() => project.split(/[\\/]/).filter(Boolean).at(-1) ?? "No project", [project]);

  async function chooseProject() {
    const selected = await open({ directory: true, multiple: false, title: "Open a repository in Localis" });
    if (typeof selected === "string") {
      setProject(selected);
      setReport(null);
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <Logo />
        <div className="privacy-rail"><i /><span>Privacy boundary</span><strong>local machine</strong></div>
        <div className="maker">Made by <strong>KebiLab</strong></div>
      </header>
      <aside className="sidebar">
        <button className="project-picker" onClick={chooseProject}>
          <span>Workspace</span><strong>{projectName}</strong><small>{project || "Choose a local repository"}</small>
        </button>
        <nav aria-label="Workspace tools">
          {operations.map((item) => (
            <button className={operation === item.id ? "active" : ""} key={item.id} onClick={() => setOperation(item.id)}>
              <span>{item.label}</span><small>{item.description}</small>
            </button>
          ))}
        </nav>
        <div className="local-proof"><i /><div><strong>Network idle</strong><span>No telemetry configured</span></div></div>
      </aside>
      <section className="workspace">
        <div className="workspace-head">
          <div><span className="kicker">{operation} workspace</span><h1>{projectName}</h1><p>{project || "Open a repository to begin."}</p></div>
          <button className="run-button" onClick={run} disabled={busy || !project.trim()}>{busy ? "Running…" : `Run ${operation}`}<span>→</span></button>
        </div>
        {error && <div className="error-banner"><strong>Could not run Localis</strong><span>{error}</span></div>}
        {!report || !reportType ? (
          <div className="welcome card"><div className="welcome-mark">L</div><span className="kicker">Your code. Your machine. Your AI.</span><h2>Open a repository,<br />then inspect the facts.</h2><p>Audit and privacy checks run locally. Ship runs only commands already declared by the selected project.</p><button onClick={chooseProject}>Choose project folder</button></div>
        ) : reportType === "audit" ? (
          <AuditView report={report as AuditReport} />
        ) : reportType === "privacy" ? (
          <PrivacyView report={report as PrivacyReport} />
        ) : (
          <ShipView report={report as ShipReport} />
        )}
      </section>
    </main>
  );
}

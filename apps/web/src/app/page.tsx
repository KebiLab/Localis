import { Logo } from "@/components/logo";
import { siApple, siGithub, siLinux } from "simple-icons";

const workflow = [
  {
    number: "01",
    title: "Choose repository",
    body: "Open a local repository from your filesystem. Nothing leaves your machine.",
    icon: "folder",
  },
  {
    number: "02",
    title: "Audit locally",
    body: "Scan code, dependencies, configuration, and project structure on-device.",
    icon: "terminal",
  },
  {
    number: "03",
    title: "Explain safely",
    body: "Ask questions and add model context only when you explicitly allow it.",
    icon: "code",
  },
  {
    number: "04",
    title: "Ship",
    body: "Run the project checks and move forward with a clear release decision.",
    icon: "rocket",
  },
];

function WorkflowIcon({ name }: { name: string }) {
  if (name === "folder") {
    return <svg viewBox="0 0 64 52" aria-hidden="true"><path d="M3 11h22l6 7h30v31H3V11Z" /><path d="M3 19h58" /></svg>;
  }
  if (name === "terminal") {
    return <svg viewBox="0 0 64 52" aria-hidden="true"><rect x="3" y="4" width="58" height="45" rx="3" /><path d="m16 18 8 8-8 8M31 35h16M3 13h58" /></svg>;
  }
  if (name === "code") {
    return <svg viewBox="0 0 64 52" aria-hidden="true"><path d="M4 4h56v38H30L19 50v-8H4V4Z" /><path d="m25 15-9 8 9 8M39 15l9 8-9 8" /></svg>;
  }
  return <svg viewBox="0 0 64 52" aria-hidden="true"><path d="M39 5c12-4 20-2 20-2s2 8-3 19L35 42 21 28 39 5Z" /><path d="m21 28-12 2-6 8 17 1M35 42l-2 8-9 1-3-12M20 43l-8 7" /></svg>;
}

function BrandIcon({ path, title }: { path: string; title: string }) {
  return (
    <svg className="railBrandIcon" viewBox="0 0 24 24" role="img" aria-label={title}>
      <path d={path} />
    </svg>
  );
}

function WindowsIcon() {
  return (
    <svg className="railBrandIcon" viewBox="0 0 24 24" role="img" aria-label="Windows">
      <path d="M2 3.4 10.7 2v9.2H2V3.4Zm9.8-1.6L22 0v11.2H11.8V1.8ZM2 12.4h8.7v9.2L2 20.2v-7.8Zm9.8 0H22V24l-10.2-1.8v-9.8Z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="downloadIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12m0 0 5-5m-5 5-5-5M4 19v2h16v-2" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="sunIcon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function DesktopScreenshot() {
  return (
    <div className="desktopShot" aria-label="Localis desktop application preview">
      <div className="shotTitlebar">
        <span className="miniBrand"><Logo compact /> Localis</span>
        <span>Private AI workspace</span>
        <span className="windowControls" aria-hidden="true">— □ ×</span>
      </div>
      <div className="desktopToolbar">
        <span className="desktopProject">▱ <b>Workspace</b>⌄</span>
        <div className="desktopTabs"><b>Audit</b><span>Privacy</span><span>Ship</span></div>
        <span className="desktopLocal"><i /> Local machine</span>
        <span className="desktopRun">Run audit</span>
      </div>
      <div className="desktopCanvas">
        <div className="desktopIntro">
          <span className="shotLabel">PROJECT EVIDENCE</span>
          <h3>Start with<br />the facts.</h3>
          <p>Choose a repository and run a local audit. Localis shows the evidence without changing your files.</p>
          <span className="desktopAction">Choose project</span>
        </div>
        <div className="desktopReport">
          <div className="reportHeader"><span>Repository audit</span><b>LOCAL</b></div>
          <div className="reportSummary">
            <div className="reportScore"><strong>87</strong><span>/100</span></div>
            <div><small>Audit score</small><strong>Strong</strong><span>23 findings · 412 files</span></div>
          </div>
          <div className="reportRows">
            <span><code>src/auth/session.ts:84</code><b className="high">High</b></span>
            <span><code>src/api/client.ts:31</code><b className="medium">Medium</b></span>
            <span><code>package.json</code><b className="low">Low</b></span>
          </div>
          <div className="reportFooter"><i /> No telemetry <span>2m 14s</span></div>
        </div>
      </div>
    </div>
  );
}

function TerminalScreenshot() {
  return (
    <div className="terminalShot" aria-label="Localis terminal interface preview">
      <div className="terminalBar">
        <span><i /><i /><i /></span>
        <b>localis — audit</b>
        <span>⌘</span>
      </div>
      <div className="terminalBody">
        <div><span className="termMuted">$</span> localis audit .</div>
        <div className="terminalSpace" />
        <div className="termViolet">LOCALIS 0.2.0</div>
        <div>Private, local-first workspace</div>
        <div className="terminalSpace" />
        <div><span className="termMuted">repository</span>  ./api-service</div>
        <div><span className="termMuted">rules</span>       28 active</div>
        <div><span className="termMuted">files</span>       1,842 scanned</div>
        <div className="terminalSpace" />
        <div><span className="termGreen">✓</span> dependency integrity</div>
        <div><span className="termGreen">✓</span> license compliance</div>
        <div><span className="termRed">!</span> hardcoded credential</div>
        <div className="termMuted">  src/config/payment.ts:14</div>
        <div className="terminalSpace" />
        <div><span className="termGreen">Audit complete</span> · 2.14s</div>
        <div>3 findings · 0 files changed</div>
        <div className="terminalSpace" />
        <div><span className="termMuted">$</span> localis privacy .</div>
        <div className="termGreen">✓ payload redacted and verified</div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main id="top">
      <header className="siteHeader">
        <nav className="nav shell" aria-label="Primary navigation">
          <a href="#top" className="brandLink" aria-label="Localis home"><Logo /></a>
          <div className="navLinks">
            <a href="#product">Docs</a>
            <a href="#security">Security</a>
            <a href="https://github.com/KebiLab/Localis/releases">Changelog</a>
            <a href="https://github.com/KebiLab/Localis">GitHub</a>
            <span className="themeMark" aria-label="Light theme"><SunIcon /></span>
          </div>
        </nav>
      </header>

      <section className="posterHero shell" aria-labelledby="hero-title">
        <div className="posterTitle" id="hero-title">
          <span>PRIVATE BY</span>
          <span>DEFAULT.</span>
        </div>
        <aside className="posterAside">
          <span className="verifiedStamp">✓ VERIFIED LOCAL</span>
          <h1>Your repository stays on your machine.</h1>
          <p>AI joins only when you allow it.</p>
          <div className="asideRule" />
          <ul>
            <li>No cloud sync.</li>
            <li>No training.</li>
            <li>No hidden payloads.</li>
            <li>Just your code, under your control.</li>
          </ul>
        </aside>
      </section>

      <section className="actionRail" aria-label="Download and platforms">
        <div className="shell actionRailInner">
          <a className="downloadButton" href="https://github.com/KebiLab/Localis/releases"><DownloadIcon /><span>Download Localis</span></a>
          <a href="https://github.com/KebiLab/Localis"><BrandIcon path={siGithub.path} title="GitHub" /><span>GitHub</span></a>
          <span><WindowsIcon /><b>Windows</b></span>
          <span><BrandIcon path={siApple.path} title="Apple" /><b>macOS</b></span>
          <span><BrandIcon path={siLinux.path} title="Linux" /><b>Linux</b></span>
          <span>Made by KebiLab</span>
        </div>
      </section>

      <section className="workflowSection" id="workflow" aria-label="How Localis works">
        <ol className="workflowGrid shell">
          {workflow.map((step) => (
            <li key={step.number}>
              <span className="stepNumber">{step.number}</span>
              <h2>{step.title}</h2>
              <div className="stepDetail">
                <WorkflowIcon name={step.icon} />
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="productSection shell" id="product" aria-labelledby="product-title">
        <div className="sectionIntro">
          <span className="sectionIndex">01 / PRODUCT</span>
          <h2 id="product-title">One engine.<br />Two interfaces.</h2>
          <p>Use the calm desktop workspace or stay in the terminal. Both run the same local-first core and produce inspectable evidence.</p>
        </div>
        <div className="showcaseGrid">
          <article className="showcaseCard showcaseDesktop">
            <header><span>Desktop application</span><b>GUI</b></header>
            <DesktopScreenshot />
            <footer><span>A visual workspace for audit, privacy, AI, and release checks.</span><b>01</b></footer>
          </article>
          <article className="showcaseCard showcaseTerminal">
            <header><span>Terminal interface</span><b>CLI</b></header>
            <TerminalScreenshot />
            <footer><span>Scriptable commands with human and JSON output.</span><b>02</b></footer>
          </article>
        </div>
      </section>

      <section className="securitySection" id="security">
        <div className="shell securityGrid">
          <div>
            <span className="sectionIndex sectionIndexLight">02 / SECURITY</span>
            <h2>LOCAL<br />MEANS LOCAL.</h2>
          </div>
          <div className="securityFacts">
            <article><span>01</span><h3>Deterministic first</h3><p>Audits run without a model and every finding points back to concrete evidence.</p></article>
            <article><span>02</span><h3>Explicit network access</h3><p>Provider requests happen only after you connect one and choose to use it.</p></article>
            <article><span>03</span><h3>Review before write</h3><p>Plans, diffs, backups, apply, and undo keep code changes visible and reversible.</p></article>
          </div>
        </div>
      </section>

      <section className="closing shell">
        <span className="sectionIndex">03 / GET LOCALIS</span>
        <h2>Know what changed.<br />Know what leaves.</h2>
        <div>
          <p>Audit the repository, inspect the privacy boundary, and keep control visible from first scan to release.</p>
          <a href="https://github.com/KebiLab/Localis">Explore Localis on GitHub ↗</a>
        </div>
      </section>

      <footer className="footer">
        <div className="shell footerInner">
          <Logo />
          <p>Private, local-first developer tooling.</p>
          <p>© 2026 KebiLab · Apache-2.0</p>
        </div>
      </footer>
    </main>
  );
}

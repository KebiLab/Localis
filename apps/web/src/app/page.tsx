import { CopyCommand } from "@/components/copy-command";
import { Logo } from "@/components/logo";
import { PrivacyBoundary } from "@/components/privacy-boundary";

const capabilities = [
  {
    label: "Audit",
    title: "Evidence, not mystery scores.",
    body: "Every finding carries a rule, severity, file, line, and concrete remediation. The first engine works fully offline.",
  },
  {
    label: "Privacy",
    title: "See what crosses the boundary.",
    body: "Localis previews and redacts model context, then gives the exact payload a stable SHA-256 identity before any request.",
  },
  {
    label: "Change",
    title: "Review the diff before the fix.",
    body: "Local AI proposes schema-constrained plans, never direct writes. Every source hash and diff is checked before confirmed apply, backup, or undo.",
  },
  {
    label: "Ship",
    title: "One calm release check.",
    body: "Audit findings, tests, types, lint, and production builds come together in one deterministic release decision.",
  },
];

const workflow = [
  ["Scan", "Localis maps the repository and runs deterministic checks without a network connection."],
  ["Understand", "Findings explain what happened, where it happened, and why it matters."],
  ["Ship", "Localis runs the project\u2019s declared checks and returns one release decision."],
];

export default function Home() {
  return (
    <main>
      <nav className="nav shell" aria-label="Primary navigation">
        <a href="#top" className="brandLink">
          <Logo />
        </a>
        <div className="navLinks">
          <a href="#workflow">How it works</a>
          <a href="#capabilities">Capabilities</a>
          <a href="https://github.com/KebiLab/Localis">GitHub</a>
        </div>
        <a className="navCta" href="https://github.com/KebiLab/Localis">
          Follow the build
        </a>
      </nav>

      <section className="hero shell" id="top">
        <div className="heroCopy">
          <p className="eyebrow">
            <span>Private AI workspace</span>
            <span className="eyebrowRule" aria-hidden="true" />
            <span>Made by KebiLab</span>
          </p>
          <h1>
            Your code belongs
            <span>on your machine.</span>
          </h1>
          <p className="heroLead">
            Localis audits projects, explains risk, and prepares safe changes
            with a local-first workflow you can inspect from end to end.
          </p>
          <div className="heroActions">
            <a className="button buttonPrimary" href="https://github.com/KebiLab/Localis">
              View on GitHub
              <span aria-hidden="true">↗</span>
            </a>
            <a className="button buttonQuiet" href="#workflow">
              Explore the workflow
            </a>
          </div>
          <CopyCommand />
          <p className="earlyNote">
            <span aria-hidden="true" />
            CLI + Desktop · Ollama + LM Studio · safe apply and undo
          </p>
        </div>

        <div className="heroVisual">
          <PrivacyBoundary />
        </div>
      </section>

      <section className="trustBar" aria-label="Localis product principles">
        <div className="shell trustInner">
          <span>Offline-first core</span>
          <span>Explicit network access</span>
          <span>Reviewable changes</span>
          <span>Open source · Apache-2.0</span>
        </div>
      </section>

      <section className="workflow shell section" id="workflow">
        <div className="sectionIntro">
          <p className="sectionLabel">A controlled workflow</p>
          <h2>AI assistance without giving up the steering wheel.</h2>
          <p>
            Localis starts with facts from your repository. Models add context
            only when you choose them.
          </p>
        </div>

        <ol className="workflowRail">
          {workflow.map(([title, body], index) => (
            <li key={title}>
              <span className="workflowIndex">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="capabilitiesSection" id="capabilities">
        <div className="shell section">
          <div className="sectionIntro compactIntro">
            <p className="sectionLabel">The workspace</p>
            <h2>One boundary. Four jobs.</h2>
          </div>

          <div className="capabilityGrid">
            {capabilities.map((capability) => (
              <article key={capability.label}>
                <span>{capability.label}</span>
                <h3>{capability.title}</h3>
                <p>{capability.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="closing shell section">
        <div>
          <p className="sectionLabel">Building in public</p>
          <h2>The safest developer workspace is one you can verify.</h2>
        </div>
        <div className="closingAction">
          <p>
            Run the audit, inspect the privacy contract, and help shape a
            developer workspace that keeps control visible.
          </p>
          <a className="button buttonPrimary" href="https://github.com/KebiLab/Localis">
            Join the project
            <span aria-hidden="true">↗</span>
          </a>
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

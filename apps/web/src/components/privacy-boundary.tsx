const localSteps = [
  ["01", "Project map", "Files are indexed on your machine."],
  ["02", "Deterministic audit", "Rules produce evidence you can inspect."],
  ["03", "Private model", "Ollama stays inside the local boundary."],
];

export function PrivacyBoundary() {
  return (
    <div className="boundary" aria-label="Localis privacy boundary diagram">
      <div className="boundaryHeader">
        <span className="boundaryStatus">
          <i aria-hidden="true" /> Local boundary active
        </span>
        <span>localhost</span>
      </div>

      <div className="boundaryCore">
        <div className="boundaryOrbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="coreLabel">
          <small>Localis Core</small>
          <strong>Your repository stays here.</strong>
        </div>
      </div>

      <ol className="boundarySteps">
        {localSteps.map(([number, title, detail]) => (
          <li key={number}>
            <span>{number}</span>
            <div>
              <strong>{title}</strong>
              <p>{detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="cloudGate">
        <span className="gateLine" aria-hidden="true" />
        <span>Cloud gate</span>
        <strong>Closed by default</strong>
      </div>
    </div>
  );
}

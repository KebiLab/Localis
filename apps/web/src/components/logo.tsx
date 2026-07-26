export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo" aria-label="Localis">
      <svg
        aria-hidden="true"
        className="logoMark"
        viewBox="0 0 40 40"
        fill="none"
      >
        <path
          d="M20 3.75 33.85 11.7v16.1L20 35.75 6.15 27.8V11.7L20 3.75Z"
          className="logoHex"
        />
        <path d="M14 12.5v14.75h12" className="logoLetter" />
        <circle cx="26" cy="27.25" r="2.35" className="logoNode" />
      </svg>
      {!compact && <span>Localis</span>}
    </span>
  );
}

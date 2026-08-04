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
          d="M20 3.5 35 12.2v6.3l-4.5-2.6v-1.1L20 8.7 9.5 14.8v12.4L20 33.3l10.5-6.1v-1.1l4.5-2.6v6.3l-15 8.7L5 29.8V12.2L20 3.5Z"
          className="logoFrame"
        />
        <path d="m13.4 15 5.1-3v11.5l8.2 4.8-4.7 2.7-8.6-5V15Z" className="logoLetter" />
      </svg>
      {!compact && <span>Localis</span>}
    </span>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

const COMMAND = "git clone https://github.com/KebiLab/Localis.git";

export function CopyCommand() {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  async function copy() {
    await navigator.clipboard.writeText(COMMAND);
    setCopied(true);
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
    }
    resetTimer.current = window.setTimeout(() => setCopied(false), 1_600);
  }

  return (
    <div className="installCommand">
      <code>
        <span aria-hidden="true">$ </span>
        {COMMAND}
      </code>
      <button type="button" onClick={copy} aria-live="polite">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

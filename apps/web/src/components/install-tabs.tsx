"use client";

import { useState } from "react";

const commands = {
  curl: "curl -fsSL https://raw.githubusercontent.com/KebiLab/Localis/main/scripts/install.sh | sh",
  npm: "npm install --global localis",
  bun: "bun add --global localis",
  winget: "winget install KebiLab.Localis",
} as const;

type InstallMethod = keyof typeof commands;

function CopyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" /><path d="M16 8V5H5v11h3" /></svg>;
}

export function InstallTabs({ locale, placement = "docs" }: { locale: "en" | "ru"; placement?: "docs" | "hero" }) {
  const [active, setActive] = useState<InstallMethod>("curl");
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    await navigator.clipboard.writeText(commands[active]);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section className={`installPanel ${placement === "hero" ? "installPanelHero" : ""}`} aria-label={locale === "ru" ? "Установка Localis" : "Install Localis"}>
      <div className="installTabs" role="tablist">
        {(Object.keys(commands) as InstallMethod[]).map((method) => (
          <button key={method} type="button" role="tab" aria-selected={active === method} onClick={() => { setActive(method); setCopied(false); }}>{method}</button>
        ))}
      </div>
      <div className="installCommand">
        <code>{commands[active]}</code>
        <button type="button" onClick={copyCommand} aria-label={locale === "ru" ? "Скопировать команду" : "Copy command"}><CopyIcon /><span>{copied ? (locale === "ru" ? "Скопировано" : "Copied") : (locale === "ru" ? "Копировать" : "Copy")}</span></button>
      </div>
      {active === "winget" && <p>{locale === "ru" ? "Команда заработает после проверки первого манифеста сообществом WinGet." : "Available after the first community WinGet manifest is approved."}</p>}
    </section>
  );
}

import { Logo } from "@/components/logo";

type Locale = "en" | "ru";

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3Z" />
    </svg>
  );
}

export function SiteHeader({ locale, page = "home" }: { locale: Locale; page?: "home" | "docs" }) {
  const isRu = locale === "ru";
  const homePath = isRu ? "/ru" : "/";
  const docsPath = isRu ? "/ru/docs" : "/docs";
  const languagePath = page === "docs" ? (isRu ? "/docs" : "/ru/docs") : (isRu ? "/" : "/ru");

  return (
    <header className="siteHeader">
      <nav className="nav shell" aria-label={isRu ? "Основная навигация" : "Primary navigation"}>
        <a href={homePath} className="brandLink" aria-label="Localis home"><Logo /></a>
        <div className="navLinks">
          <a href={docsPath} aria-current={page === "docs" ? "page" : undefined}>{isRu ? "Документация" : "Docs"}</a>
          <a href={`${homePath}#security`}>{isRu ? "Безопасность" : "Security"}</a>
          <a href="https://github.com/KebiLab/Localis/releases">{isRu ? "Релизы" : "Changelog"}</a>
          <a href="https://github.com/KebiLab/Localis">GitHub</a>
          <a className="languageSwitch" href={languagePath} aria-label={isRu ? "Switch to English" : "Переключить на русский"}>
            <GlobeIcon />
            <span>{isRu ? "EN" : "RU"}</span>
          </a>
        </div>
      </nav>
    </header>
  );
}

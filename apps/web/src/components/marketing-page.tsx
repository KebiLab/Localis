import Image from "next/image";
import { siApple, siGithub, siLinux } from "simple-icons";

import { Logo } from "@/components/logo";
import { SiteHeader } from "@/components/site-header";

type Locale = "en" | "ru";

const copy = {
  en: {
    heroPoster: ["PRIVATE BY", "DEFAULT."],
    heroTitle: "Your code stays on your machine.",
    heroBody: "Local audits run offline. AI receives only the files and context you explicitly approve.",
    heroFacts: ["Offline audit by default.", "Preview every AI payload.", "No telemetry.", "Review before write."],
    download: "Download Localis",
    workflow: [
      ["Choose repository", "Open a repository from your filesystem. Nothing is uploaded."],
      ["Audit locally", "Scan code, dependencies, configuration, and project structure on-device."],
      ["Explain safely", "Add a local or API model only when you choose to share scoped context."],
      ["Ship", "Run tests, types, lint, and builds before making a release decision."],
    ],
    productTitle: "The same evidence.\nYour preferred interface.",
    productBody: "Use the desktop workspace for visual review or run the same local-first engine in a terminal. These are real captures from Localis 0.2.0.",
    desktop: "Desktop application",
    desktopBody: "Choose a project, inspect findings, review privacy boundaries, and run release checks.",
    terminal: "Terminal interface",
    terminalBody: "Scriptable commands with readable output and a stable JSON mode for automation.",
    securityTitle: "LOCAL\nMEANS LOCAL.",
    security: [
      ["Deterministic first", "Audits work without a model. Every finding points to a file, line, rule, and concrete reason."],
      ["Explicit network access", "Provider requests happen only after you connect one and choose the exact context to send."],
      ["Review before write", "Plans, diffs, backups, apply, and undo keep every code change visible and reversible."],
    ],
    closingTitle: "Know what changed.\nKnow what leaves.",
    closingBody: "Start with a deterministic audit, inspect the privacy manifest, and keep control visible from the first scan to release.",
    closingLink: "Read the documentation →",
    footerTagline: "Private, local-first developer tooling.",
    inspired: "Inspired by the open-source work and ideas of Andrew-py-dew.",
  },
  ru: {
    heroPoster: ["ПРИВАТНО ПО", "УМОЛЧАНИЮ."],
    heroTitle: "Ваш код остаётся на вашем компьютере.",
    heroBody: "Локальный аудит работает офлайн. ИИ получает только те файлы и контекст, которые вы разрешили отправить.",
    heroFacts: ["Аудит офлайн по умолчанию.", "Предпросмотр каждого AI-запроса.", "Без телеметрии.", "Проверка до записи."],
    download: "Скачать Localis",
    workflow: [
      ["Выберите репозиторий", "Откройте проект с диска. Localis ничего не загружает автоматически."],
      ["Проверьте локально", "Просканируйте код, зависимости, конфигурацию и структуру проекта на устройстве."],
      ["Подключите ИИ", "Добавьте локальную или API-модель и сами выберите контекст для отправки."],
      ["Подготовьте релиз", "Запустите тесты, типы, линтер и сборку перед решением о выпуске."],
    ],
    productTitle: "Одни доказательства.\nДва удобных интерфейса.",
    productBody: "Работайте в графическом приложении или запускайте то же локальное ядро в терминале. Ниже — реальные снимки Localis 0.2.0.",
    desktop: "Приложение",
    desktopBody: "Выбирайте проект, изучайте находки, проверяйте границы приватности и готовность к релизу.",
    terminal: "Терминал",
    terminalBody: "Команды для ручной работы и автоматизации со стабильным JSON-выводом.",
    securityTitle: "LOCAL\nЗНАЧИТ LOCAL.",
    security: [
      ["Сначала факты", "Аудит работает без модели. Каждая находка содержит файл, строку, правило и конкретную причину."],
      ["Сеть только явно", "Запрос к провайдеру отправляется только после подключения и выбора точного контекста."],
      ["Проверка до записи", "Планы, diff, резервные копии, применение и отмена делают изменения видимыми и обратимыми."],
    ],
    closingTitle: "Знайте, что изменилось.\nЗнайте, что отправляется.",
    closingBody: "Начните с детерминированного аудита, проверьте privacy manifest и сохраняйте контроль до самого релиза.",
    closingLink: "Открыть документацию →",
    footerTagline: "Приватные local-first инструменты для разработчиков.",
    inspired: "Проект вдохновлён идеями и open-source работой Andrew-py-dew.",
  },
} as const;

const workflowIcons = ["folder", "terminal", "code", "rocket"] as const;

function WorkflowIcon({ name }: { name: (typeof workflowIcons)[number] }) {
  if (name === "folder") return <svg viewBox="0 0 64 52" aria-hidden="true"><path d="M3 11h22l6 7h30v31H3V11Z" /><path d="M3 19h58" /></svg>;
  if (name === "terminal") return <svg viewBox="0 0 64 52" aria-hidden="true"><rect x="3" y="4" width="58" height="45" rx="3" /><path d="m16 18 8 8-8 8M31 35h16M3 13h58" /></svg>;
  if (name === "code") return <svg viewBox="0 0 64 52" aria-hidden="true"><path d="M4 4h56v38H30L19 50v-8H4V4Z" /><path d="m25 15-9 8 9 8M39 15l9 8-9 8" /></svg>;
  return <svg viewBox="0 0 64 52" aria-hidden="true"><path d="M39 5c12-4 20-2 20-2s2 8-3 19L35 42 21 28 39 5Z" /><path d="m21 28-12 2-6 8 17 1M35 42l-2 8-9 1-3-12M20 43l-8 7" /></svg>;
}

function BrandIcon({ path, title }: { path: string; title: string }) {
  return <svg className="railBrandIcon" viewBox="0 0 24 24" role="img" aria-label={title}><path d={path} /></svg>;
}

function WindowsIcon() {
  return <svg className="railBrandIcon" viewBox="0 0 24 24" role="img" aria-label="Windows"><path d="M2 3.4 10.7 2v9.2H2V3.4Zm9.8-1.6L22 0v11.2H11.8V1.8ZM2 12.4h8.7v9.2L2 20.2v-7.8Zm9.8 0H22V24l-10.2-1.8v-9.8Z" /></svg>;
}

function DownloadIcon() {
  return <svg className="downloadIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M4 19v2h16v-2" /></svg>;
}

export function MarketingPage({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const docsPath = locale === "ru" ? "/ru/docs" : "/docs";

  return (
    <main id="top">
      <SiteHeader locale={locale} />

      <section className="posterHero shell" aria-labelledby="hero-title">
        <div className={`posterTitle ${locale === "ru" ? "posterTitleRu" : ""}`} id="hero-title">{t.heroPoster.map((line) => <span key={line}>{line}</span>)}</div>
        <aside className="posterAside">
          <span className="verifiedStamp">✓ VERIFIED LOCAL</span>
          <h1>{t.heroTitle}</h1>
          <p>{t.heroBody}</p>
          <div className="asideRule" />
          <ul>{t.heroFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
        </aside>
      </section>

      <section className="actionRail" aria-label="Download and platforms">
        <div className="shell actionRailInner">
          <a className="downloadButton" href="https://github.com/KebiLab/Localis/releases"><DownloadIcon /><span>{t.download}</span></a>
          <a href="https://github.com/KebiLab/Localis"><BrandIcon path={siGithub.path} title="GitHub" /><span>GitHub</span></a>
          <span><WindowsIcon /><b>Windows</b></span>
          <span><BrandIcon path={siApple.path} title="Apple" /><b>macOS</b></span>
          <span><BrandIcon path={siLinux.path} title="Linux" /><b>Linux</b></span>
          <span>Made by KebiLab</span>
        </div>
      </section>

      <section className="workflowSection" aria-label="How Localis works">
        <ol className="workflowGrid shell">
          {t.workflow.map(([title, body], index) => (
            <li key={title}>
              <span className="stepNumber">{String(index + 1).padStart(2, "0")}</span>
              <h2>{title}</h2>
              <div className="stepDetail"><WorkflowIcon name={workflowIcons[index]} /><p>{body}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="productSection shell" id="product" aria-labelledby="product-title">
        <div className="sectionIntro sectionIntroClean">
          <h2 id="product-title">{t.productTitle.split("\n").map((line) => <span key={line}>{line}</span>)}</h2>
          <p>{t.productBody}</p>
        </div>
        <div className="showcaseGrid realShowcaseGrid">
          <article className="showcaseCard">
            <header><span>{t.desktop}</span><b>GUI</b></header>
            <div className="realScreenshot desktopScreenshot"><Image src="/screenshots/localis-desktop.png" alt="Localis desktop application running on Windows" width={1919} height={1017} priority /></div>
            <footer><span>{t.desktopBody}</span></footer>
          </article>
          <article className="showcaseCard">
            <header><span>{t.terminal}</span><b>CLI</b></header>
            <div className="realScreenshot terminalScreenshot"><Image src="/screenshots/localis-cli.png" alt="Real Localis CLI audit output" width={1400} height={900} /></div>
            <footer><span>{t.terminalBody}</span></footer>
          </article>
        </div>
      </section>

      <section className="securitySection" id="security">
        <div className="shell securityGrid">
          <div><h2>{t.securityTitle.split("\n").map((line) => <span key={line}>{line}</span>)}</h2></div>
          <div className="securityFacts">
            {t.security.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </div>
      </section>

      <section className="closing shell">
        <h2>{t.closingTitle.split("\n").map((line) => <span key={line}>{line}</span>)}</h2>
        <div><p>{t.closingBody}</p><a href={docsPath}>{t.closingLink}</a></div>
      </section>

      <footer className="footer">
        <div className="shell footerInner">
          <Logo />
          <div><p>{t.footerTagline}</p><p>{t.inspired} <a href="https://github.com/Andrew-py-dew">github.com/Andrew-py-dew ↗</a></p></div>
          <p>© 2026 KebiLab · Apache-2.0</p>
        </div>
      </footer>
    </main>
  );
}

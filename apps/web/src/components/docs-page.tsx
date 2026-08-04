import { Logo } from "@/components/logo";
import { SiteHeader } from "@/components/site-header";

type Locale = "en" | "ru";

const docs = {
  en: {
    eyebrow: "LOCALIS DOCUMENTATION",
    title: "Start local.\nAdd AI deliberately.",
    intro: "Install the CLI, audit a repository without a model, then connect Ollama, LM Studio, or an OpenAI-compatible provider only when you need it.",
    nav: ["Install", "First audit", "Commands", "AI providers", "Privacy", "Desktop", "Release gate"],
    sections: [
      { id: "install", title: "Install", body: "Localis requires Node.js 20.9 or newer. npm, Bun, and the install script all provide the same CLI.", code: "npm install --global localis\n# or\nbun add --global localis\n# macOS / Linux\ncurl -fsSL https://raw.githubusercontent.com/KebiLab/Localis/main/scripts/install.sh | sh\n# run once without installing\nnpx localis doctor" },
      { id: "first-audit", title: "Run the first audit", body: "The deterministic scanner works offline and does not modify your files.", code: "cd your-repository\nlocalis audit .\nlocalis audit . --json" },
      { id: "commands", title: "Core commands", body: "Use readable terminal output for daily work and --json for CI or editor integrations.", list: [["audit", "Scan source, dependencies, and configuration."], ["privacy", "Preview redaction, selected files, and the exact payload hash."], ["test", "Discover and run tests across Node.js, Python, Rust, and Go."], ["ship", "Run audit, tests, types, lint, and build as one release gate."], ["history / undo", "Inspect private backups and safely restore an applied plan."]] },
      { id: "providers", title: "AI providers", body: "Localis discovers models from Ollama, LM Studio, OpenAI, OpenRouter, or another OpenAI-compatible API. API keys are read from an environment variable and never accepted as a command-line value.", code: "$env:OPENAI_API_KEY = \"your-key\"\nlocalis models --provider openai-compatible `\n  --endpoint https://api.openai.com/v1 `\n  --api-key-env OPENAI_API_KEY" },
      { id: "privacy", title: "Privacy boundary", body: "Run a dry request before contacting a provider. The output lists selected files, redactions, endpoint, model, and SHA-256 payload hash.", code: "localis ask \"Explain this module\" . `\n  --file src/auth `\n  --dry-run" },
      { id: "desktop", title: "Desktop application", body: "The Tauri application exposes Audit, Privacy, Ship, and provider settings in a native workspace. Download an installer from GitHub Releases or build it locally with Rust installed.", code: "npm install\nnpm run build\nnpm run tauri:build -w @localis/desktop" },
      { id: "release", title: "Release gate", body: "Ship combines the checks that answer whether the current repository is ready to release. It exits non-zero when a blocking check fails.", code: "localis ship .\nlocalis ship . --json" },
    ],
  },
  ru: {
    eyebrow: "ДОКУМЕНТАЦИЯ LOCALIS",
    title: "Начните локально.\nПодключайте ИИ осознанно.",
    intro: "Установите CLI, проверьте репозиторий без модели, а затем при необходимости подключите Ollama, LM Studio или OpenAI-совместимый API.",
    nav: ["Установка", "Первый аудит", "Команды", "AI-провайдеры", "Приватность", "Приложение", "Проверка релиза"],
    sections: [
      { id: "install", title: "Установка", body: "Для Localis нужен Node.js 20.9 или новее. npm, Bun и install-скрипт устанавливают один CLI.", code: "npm install --global localis\n# или\nbun add --global localis\n# macOS / Linux\ncurl -fsSL https://raw.githubusercontent.com/KebiLab/Localis/main/scripts/install.sh | sh\n# однократный запуск без установки\nnpx localis doctor" },
      { id: "first-audit", title: "Первый аудит", body: "Детерминированный сканер работает офлайн и не изменяет файлы.", code: "cd ваш-репозиторий\nlocalis audit .\nlocalis audit . --json" },
      { id: "commands", title: "Основные команды", body: "Используйте читаемый вывод в терминале и --json для CI или интеграций с редакторами.", list: [["audit", "Проверка исходников, зависимостей и конфигурации."], ["privacy", "Просмотр редактирования, выбранных файлов и хеша payload."], ["test", "Поиск и запуск тестов Node.js, Python, Rust и Go."], ["ship", "Аудит, тесты, типы, линтер и сборка одним запуском."], ["history / undo", "Просмотр приватных резервных копий и безопасный откат плана."]] },
      { id: "providers", title: "AI-провайдеры", body: "Localis получает список моделей из Ollama, LM Studio, OpenAI, OpenRouter или другого OpenAI-совместимого API. Ключ читается из переменной окружения и не передаётся аргументом команды.", code: "$env:OPENAI_API_KEY = \"ваш-ключ\"\nlocalis models --provider openai-compatible `\n  --endpoint https://api.openai.com/v1 `\n  --api-key-env OPENAI_API_KEY" },
      { id: "privacy", title: "Граница приватности", body: "Перед обращением к провайдеру выполните dry-run. Localis покажет файлы, редактирование, endpoint, модель и SHA-256 хеш payload.", code: "localis ask \"Объясни этот модуль\" . `\n  --file src/auth `\n  --dry-run" },
      { id: "desktop", title: "Приложение", body: "Tauri-приложение объединяет Audit, Privacy, Ship и настройки провайдеров. Скачайте установщик из GitHub Releases или соберите локально с установленным Rust.", code: "npm install\nnpm run build\nnpm run tauri:build -w @localis/desktop" },
      { id: "release", title: "Проверка релиза", body: "Ship объединяет проверки готовности репозитория. Команда завершится с ненулевым кодом, если найдена блокирующая проблема.", code: "localis ship .\nlocalis ship . --json" },
    ],
  },
} as const;

export function DocsPage({ locale }: { locale: Locale }) {
  const t = docs[locale];
  return (
    <main>
      <SiteHeader locale={locale} page="docs" />
      <section className="docsHero shell">
        <p>{t.eyebrow}</p>
        <h1>{t.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1>
        <div><p>{t.intro}</p><a href="#install">{locale === "ru" ? "Начать ↓" : "Get started ↓"}</a></div>
      </section>
      <div className="docsLayout shell">
        <aside className="docsSidebar">
          <strong>{locale === "ru" ? "На этой странице" : "On this page"}</strong>
          <nav>{t.sections.map((section, index) => <a key={section.id} href={`#${section.id}`}>{t.nav[index]}</a>)}</nav>
          <a className="docsGithub" href="https://github.com/KebiLab/Localis">Edit on GitHub ↗</a>
        </aside>
        <article className="docsContent">
          {t.sections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
              {"code" in section && <pre><code>{section.code}</code></pre>}
              {"list" in section && <dl>{section.list.map(([term, description]) => <div key={term}><dt>{term}</dt><dd>{description}</dd></div>)}</dl>}
            </section>
          ))}
        </article>
      </div>
      <footer className="footer docsFooter"><div className="shell footerInner"><Logo /><p>{locale === "ru" ? "Документация Localis 0.2.0" : "Localis 0.2.0 documentation"}</p><p>© 2026 KebiLab · Apache-2.0</p></div></footer>
    </main>
  );
}

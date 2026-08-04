import type { Metadata } from "next";

import { DocsPage } from "@/components/docs-page";

export const metadata: Metadata = {
  title: "Документация",
  description: "Установка Localis, локальный аудит, AI-провайдеры и проверка готовности к релизу.",
};

export default function RussianDocumentation() {
  return <DocsPage locale="ru" />;
}

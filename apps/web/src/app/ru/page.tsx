import type { Metadata } from "next";

import { MarketingPage } from "@/components/marketing-page";

export const metadata: Metadata = {
  title: "Localis — приватное AI-пространство для разработчиков",
  description: "Локальный аудит кода, безопасные AI-планы и проверка готовности к релизу.",
};

export default function RussianHome() {
  return <MarketingPage locale="ru" />;
}

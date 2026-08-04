import type { Metadata } from "next";

import { DocsPage } from "@/components/docs-page";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Install Localis, run a private audit, connect AI providers, and use the release gate.",
};

export default function Documentation() {
  return <DocsPage locale="en" />;
}

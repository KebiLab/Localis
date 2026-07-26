import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://localis.dev"),
  title: {
    default: "Localis — Private AI workspace for developers",
    template: "%s · Localis",
  },
  description:
    "Audit code, plan safe fixes, and ship with confidence. Local-first by design, with every network boundary under your control.",
  applicationName: "Localis",
  authors: [{ name: "KebiLab" }],
  creator: "KebiLab",
  openGraph: {
    type: "website",
    title: "Localis — Your code. Your machine. Your AI.",
    description:
      "A private, local-first developer workspace by KebiLab.",
    siteName: "Localis",
  },
  twitter: {
    card: "summary_large_image",
    title: "Localis — Your code. Your machine. Your AI.",
    description:
      "A private, local-first developer workspace by KebiLab.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

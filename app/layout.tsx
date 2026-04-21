import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { LegacyCacheReset } from "@/components/legacy-cache-reset";
import { defaultMetadata } from "@/lib/site";

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <LegacyCacheReset />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

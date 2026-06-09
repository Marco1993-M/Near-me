import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { AppVersionRefresh } from "@/components/app-version-refresh";
import { LegacyCacheReset } from "@/components/legacy-cache-reset";
import { defaultMetadata } from "@/lib/site";

export const metadata: Metadata = defaultMetadata;

const gaMeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-X2Z44FJY9Z";
const appVersion =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.VERCEL_DEPLOYMENT_ID ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
  process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID ??
  "dev";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaMeasurementId}');
          `}
        </Script>
        <LegacyCacheReset />
        <AppVersionRefresh currentVersion={appVersion} />
        <AppShell>{children}</AppShell>
        <Analytics />
      </body>
    </html>
  );
}

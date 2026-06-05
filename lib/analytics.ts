"use client";

import { track } from "@vercel/analytics";

type AnalyticsPrimitive = string | number | boolean | null;
type AnalyticsProperties = Record<string, AnalyticsPrimitive | undefined>;

export function trackEvent(name: string, properties?: AnalyticsProperties) {
  const sanitizedProperties =
    properties &&
    Object.fromEntries(
      Object.entries(properties).filter(([, value]) => value !== undefined),
    );

  track(name, sanitizedProperties && Object.keys(sanitizedProperties).length > 0 ? sanitizedProperties : undefined);
}

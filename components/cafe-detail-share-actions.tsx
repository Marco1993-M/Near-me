"use client";

import { useState } from "react";

type CafeDetailShareActionsProps = {
  cafeName: string;
  visitUrl: string;
  reviewUrl: string;
  visitText: string;
  reviewText: string;
};

function getWhatsAppHref(text: string, url: string) {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`;
}

export function CafeDetailShareActions({
  cafeName,
  visitUrl,
  reviewUrl,
  visitText,
  reviewText,
}: CafeDetailShareActionsProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  async function sharePage(kind: "visit" | "review") {
    const title = kind === "visit" ? `${cafeName} on Near Me` : `Help review ${cafeName}`;
    const text = kind === "visit" ? visitText : reviewText;
    const url = kind === "visit" ? visitUrl : reviewUrl;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        setFeedback(kind === "visit" ? "Shared cafe page" : "Shared review request");
        window.setTimeout(() => setFeedback(null), 2200);
        return;
      } catch {
        return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${text}\n\n${url}`);
      setFeedback("Copied share text");
      window.setTimeout(() => setFeedback(null), 2200);
    }
  }

  return (
    <div className="cafe-detail-share-row">
      <div className="cafe-detail-share-actions">
        <button type="button" onClick={() => void sharePage("visit")}>
          Send to a friend
        </button>
        <button type="button" onClick={() => void sharePage("review")}>
          Ask someone to review
        </button>
        <a href={getWhatsAppHref(reviewText, reviewUrl)} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
      </div>
      <span>{feedback ?? "Share by messaging; no email needed."}</span>
    </div>
  );
}

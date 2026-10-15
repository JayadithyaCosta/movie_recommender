"use client";

import type { FeedbackBody } from "@/lib/schemas";

/** Fire a card action. Resolves `false` on failure so the caller can roll back. */
export async function postFeedback(body: FeedbackBody): Promise<boolean> {
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

import posthog from "posthog-js";

export function initAnalytics() {
  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: "https://app.posthog.com",
    capture_pageview: false,
    autocapture: true,
  });
}

export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  posthog.capture(event, props);
}

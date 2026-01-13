// Lightweight analytics shim. Replace or extend with your real analytics pipeline.
// Usage: logEvent('event_name', { optional: 'payload' })
export type AnalyticsPayload = Record<string, any> | undefined;

export function logEvent(event: string, payload?: AnalyticsPayload) {
    try {
        // In production, wire this to your analytics endpoint or dataLayer
        // Example: window.dataLayer?.push({ event, ...payload });
    } catch (e) {
        // Silently fail - don't interrupt user experience
    }
}

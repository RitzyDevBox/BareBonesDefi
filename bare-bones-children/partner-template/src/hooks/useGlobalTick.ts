import { useEffect, useState } from "react";

// Single 1 Hz interval shared across the app. Component-level subscribers
// pick a "bucket" cadence (every N seconds) and only re-render when their
// bucket changes — avoids spinning up a setInterval per subscriber and
// avoids re-rendering everyone every second.
//
// Usage:
//   const refreshKey = useGlobalTick(5);   // changes every 5 seconds
//   useEffect(() => { fetchData(); }, [refreshKey, txVersion]);
//
// Pauses while the document is hidden (Page Visibility API) so a
// backgrounded tab doesn't pile up RPC calls. Resumes immediately when
// the tab is focused again.

let tickValue = 0;
const subscribers = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let visibilityListenerAttached = false;

function fireAll(): void {
  for (const fn of subscribers) fn();
}

function startInterval(): void {
  if (intervalId !== null) return;
  intervalId = setInterval(() => {
    tickValue += 1;
    fireAll();
  }, 1000);
}

function stopInterval(): void {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
}

function attachVisibilityListener(): void {
  if (visibilityListenerAttached) return;
  if (typeof document === "undefined") return;
  visibilityListenerAttached = true;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopInterval();
    } else if (subscribers.size > 0) {
      // Bump the tick on resume so subscribers refetch immediately
      // instead of waiting for their next bucket boundary.
      tickValue += 1;
      fireAll();
      startInterval();
    }
  });
}

function ensureRunning(): void {
  attachVisibilityListener();
  if (typeof document !== "undefined" && document.hidden) return;
  startInterval();
}

/**
 * Returns a value that changes every `everyNSeconds` seconds, derived
 * from a single 1 Hz tick shared across the whole app.
 *
 * Default cadence is 5 s — appropriate for most "keep this view fresh"
 * use cases (proposal lists, eligibility re-checks, etc.). Pass a
 * smaller number for finer granularity (countdown timers etc.) but
 * remember each subscriber re-renders at its bucket cadence.
 */
export function useGlobalTick(everyNSeconds: number = 5): number {
  const interval = Math.max(1, Math.floor(everyNSeconds));
  const [bucket, setBucket] = useState(() => Math.floor(tickValue / interval));

  useEffect(() => {
    const onTick = () => {
      const next = Math.floor(tickValue / interval);
      setBucket((prev) => (prev !== next ? next : prev));
    };
    subscribers.add(onTick);
    ensureRunning();
    return () => {
      subscribers.delete(onTick);
      // Last subscriber unmounted — stop the interval so dev HMR /
      // unit-test environments don't leak handles.
      if (subscribers.size === 0) stopInterval();
    };
  }, [interval]);

  return bucket;
}

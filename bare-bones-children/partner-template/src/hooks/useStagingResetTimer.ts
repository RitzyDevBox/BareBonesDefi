import { useEffect, useRef, useState } from "react";
import { DEPLOYMENT_TARGET, DeploymentTarget, STAGING_RPC_URL } from "../config/deployment";

interface ResetInfo {
  intervalSeconds: number;
  lastResetAt: string;
  nextResetAt: string;
  secondsUntilReset: number;
}

interface UseStagingResetTimerResult {
  /** Live seconds until next reset, ticked locally between polls. null while
   *  loading the first response or when not running against staging. */
  secondsUntilReset: number | null;
  /** Cron interval — used by callers that want to format both
   *  "every N hours" and "in M:SS". */
  intervalSeconds: number | null;
  nextResetAt: Date | null;
  /** True only when DEPLOYMENT_TARGET=staging — gates UI like the intro modal. */
  enabled: boolean;
}

/** Frequency to actually re-fetch the marker from the server. The local 1 Hz
 *  tick handles the visible countdown; the network call only exists to
 *  re-anchor against truth (in case a cron fired and reset the timer). */
const REFETCH_INTERVAL_MS = 60_000;

function endpointUrl(): string | null {
  if (DEPLOYMENT_TARGET !== DeploymentTarget.Staging) return null;
  try {
    const u = new URL(STAGING_RPC_URL);
    u.pathname = "/reset-info";
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return STAGING_RPC_URL.replace(/\/rpc\/?$/, "") + "/reset-info";
  }
}

export function useStagingResetTimer(): UseStagingResetTimerResult {
  const enabled = DEPLOYMENT_TARGET === DeploymentTarget.Staging;
  const [secondsUntilReset, setSeconds] = useState<number | null>(null);
  const [intervalSeconds, setInterval_] = useState<number | null>(null);
  const [nextResetAt, setNextResetAt] = useState<Date | null>(null);
  const url = useRef(endpointUrl());

  useEffect(() => {
    if (!enabled || !url.current) return;
    let cancelled = false;

    async function refetch() {
      try {
        const res = await fetch(url.current as string, { cache: "no-store" });
        if (!res.ok) throw new Error(`reset-info ${res.status}`);
        const info = (await res.json()) as ResetInfo;
        if (cancelled) return;
        setSeconds(info.secondsUntilReset);
        setInterval_(info.intervalSeconds);
        setNextResetAt(new Date(info.nextResetAt));
      } catch (err) {
        // Network blip / proxy redeploying / DNS — keep the local countdown
        // running off the last known good value; don't blank it out.
        // eslint-disable-next-line no-console
        console.warn("[reset-info] fetch failed:", err);
      }
    }

    refetch();
    const refetchTimer = window.setInterval(refetch, REFETCH_INTERVAL_MS);
    // 1 Hz local tick. We decrement the cached value rather than recomputing
    // from nextResetAt every tick so a small clock skew between client and
    // server doesn't cause the displayed countdown to jitter.
    const tickTimer = window.setInterval(() => {
      if (cancelled) return;
      setSeconds((prev) => (prev == null ? prev : Math.max(0, prev - 1)));
    }, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(refetchTimer);
      window.clearInterval(tickTimer);
    };
  }, [enabled]);

  return { secondsUntilReset, intervalSeconds, nextResetAt, enabled };
}

export function formatCountdown(seconds: number | null): string {
  if (seconds == null) return "—:—:—";
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

import type { Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

type Frame = { buf: Buffer; t: number };

/** A focus point: absolute Date.now() timestamp + the on-screen pixel the
 *  view should be centered on at that moment (viewport coords == frame px). */
export type FocusPoint = { t: number; x: number; y: number };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const even = (v: number) => Math.round(v / 2) * 2;

/** Build a piecewise-linear ffmpeg expression (in the crop `t` variable, in
 *  seconds) that holds the first value, lerps between keyframes, and holds the
 *  last. Returns the body only — caller wraps it in single quotes so the
 *  commas inside if()/lerp aren't read as filtergraph separators. */
/** Drop interior keyframes that sit on a flat run (equal to both neighbors),
 *  so a stationary cursor collapses to just its run's start + end. */
function reduceKeys(keys: { tr: number; c: number }[]): { tr: number; c: number }[] {
  if (keys.length <= 2) return keys;
  const out = [keys[0]];
  for (let i = 1; i < keys.length - 1; i++) {
    if (!(keys[i].c === keys[i - 1].c && keys[i].c === keys[i + 1].c)) out.push(keys[i]);
  }
  out.push(keys[keys.length - 1]);
  return out;
}

function panExpr(keys: { tr: number; c: number }[]): string {
  if (keys.length === 1) return `${keys[0].c}`;
  // Flat sum of disjoint half-open segments — exactly one term is non-zero at
  // any t, so summing == selecting. Avoids the deep if()-nesting that blows
  // ffmpeg's expression parser ("Missing ')' or too many args").
  const first = keys[0];
  const last = keys[keys.length - 1];
  const terms: string[] = [`lt(t,${first.tr.toFixed(3)})*${first.c}`];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    const dt = Math.max(0.001, b.tr - a.tr);
    terms.push(
      `gte(t,${a.tr.toFixed(3)})*lt(t,${b.tr.toFixed(3)})*(${a.c}+(${b.c}-${a.c})*(t-${a.tr.toFixed(3)})/${dt.toFixed(3)})`,
    );
  }
  terms.push(`gte(t,${last.tr.toFixed(3)})*${last.c}`);
  return terms.join("+");
}

/**
 * Record a pitch-video clip by driving the page with Playwright while
 * pulling frames over CDP `Page.startScreencast` (PNG) and encoding them
 * with ffmpeg to constant-fps H.264 — NOT Playwright's built-in webm
 * recorder, which is variable-framerate and softer. This matches the
 * card-capture pipeline (CDP screencast → ffmpeg CRF16).
 *
 * Frame timing comes from real arrival deltas, so on-screen holds
 * (visualCursor `hold()`) are preserved 1:1 in the output. The clip's
 * wall-clock length == the duration of `action()`.
 */
export async function recordClip(
  page: Page,
  outPath: string,
  action: () => Promise<void>,
  opts: {
    fps?: number;
    width?: number;
    height?: number;
    /** Pan/zoom factor (>1). When set with `focus`, the output crops to
     *  width/zoom × height/zoom around the focus path and scales back up. */
    zoom?: number;
    /** Focus path the zoomed view follows. Mutated-by-reference is fine —
     *  it's read after `action()` resolves, so the action can push points. */
    focus?: FocusPoint[];
    /** How strongly the view tracks the focus point vs. staying centered,
     *  per axis (0 = locked to center, 1 = follows fully). The app is a
     *  centered column, so default to gentle X tracking, stronger Y. */
    followX?: number;
    followY?: number;
  } = {},
): Promise<{ frames: number; seconds: number }> {
  const { fps = 30, width = 1920, height = 1080, zoom, focus, followX = 0.3, followY = 0.7 } = opts;

  const client = await page.context().newCDPSession(page);
  const frames: Frame[] = [];
  let recording = true;

  client.on("Page.screencastFrame", (e: { data: string; sessionId: number }) => {
    if (recording) frames.push({ buf: Buffer.from(e.data, "base64"), t: Date.now() });
    // Must ack every frame or the screencast stalls after a few frames.
    void client.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
  });

  await client.send("Page.startScreencast", {
    format: "png",
    maxWidth: width,
    maxHeight: height,
    everyNthFrame: 1,
  });
  const t0 = Date.now();

  await action();

  // Let the final visual state settle into a frame or two.
  await page.waitForTimeout(150);
  recording = false;
  const tEnd = Date.now();
  await client.send("Page.stopScreencast").catch(() => {});
  await client.detach().catch(() => {});

  if (frames.length === 0) throw new Error("recordClip: no frames captured");

  // Stage frames + a concat manifest whose per-frame durations are the
  // real inter-frame deltas. ffmpeg's `fps` filter then resamples this
  // variable timeline to a clean constant fps, holds included.
  const work = mkdtempSync(path.join(tmpdir(), "pwclip-"));
  try {
    const lines: string[] = ["ffconcat version 1.0"];
    for (let i = 0; i < frames.length; i++) {
      const file = path.join(work, `f${String(i).padStart(6, "0")}.png`);
      writeFileSync(file, frames[i].buf);
      const next = i + 1 < frames.length ? frames[i + 1].t : tEnd;
      // Keep the REAL inter-frame delta (just guard against 0). Flooring to
      // 1/fps would stretch time whenever frames arrive faster than fps
      // (e.g. keystroke bursts); the `fps` filter below resamples to a
      // constant rate while preserving true wall-clock timing + holds.
      const dur = Math.max(0.001, (next - frames[i].t) / 1000);
      lines.push(`file '${file}'`);
      lines.push(`duration ${dur.toFixed(4)}`);
    }
    // Repeat the last frame so the concat demuxer honors its duration.
    lines.push(`file '${path.join(work, `f${String(frames.length - 1).padStart(6, "0")}.png`)}'`);

    const listPath = path.join(work, "frames.txt");
    writeFileSync(listPath, lines.join("\n") + "\n");

    // Optional pan/zoom: crop a (W/zoom × H/zoom) window that glides along the
    // focus path, then scale back to full size. Time base = first frame, which
    // is where the concat demuxer's PTS starts at 0.
    let vf = `fps=${fps},format=yuv420p`;
    // Kill switch: `DEMO_NOZOOM=1` disables pan/zoom for all clips regardless
    // of per-clip opts, so the flat version is one env var away.
    const zoomOn = process.env.DEMO_NOZOOM !== "1";
    if (zoomOn && zoom && zoom > 1 && focus && focus.length > 0) {
      const base = frames[0].t;
      const cw = even(width / zoom);
      const ch = even(height / zoom);
      // Bias each focus point toward the frame center per axis so the view
      // doesn't chase the cursor into empty margins — content is centered.
      const keysX = focus.map((f) => {
        const biased = width / 2 + followX * (f.x - width / 2);
        return { tr: Math.max(0, (f.t - base) / 1000), c: Math.round(clamp(biased - cw / 2, 0, width - cw)) };
      });
      const keysY = focus.map((f) => {
        const biased = height / 2 + followY * (f.y - height / 2);
        return { tr: Math.max(0, (f.t - base) / 1000), c: Math.round(clamp(biased - ch / 2, 0, height - ch)) };
      });
      vf = `crop=${cw}:${ch}:x='${panExpr(reduceKeys(keysX))}':y='${panExpr(reduceKeys(keysY))}',scale=${width}:${height}:flags=lanczos,fps=${fps},format=yuv420p`;
    }

    mkdirSync(path.dirname(outPath), { recursive: true });
    const res = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-f", "concat", "-safe", "0", "-i", listPath,
        "-vf", vf,
        "-c:v", "libx264", "-crf", "16", "-preset", "medium",
        "-movflags", "+faststart",
        outPath,
      ],
      { stdio: "inherit" },
    );
    if (res.status !== 0) throw new Error(`ffmpeg failed (status ${res.status})`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  const seconds = (tEnd - t0) / 1000;
  // eslint-disable-next-line no-console
  console.log(`[recordClip] ${outPath} — ${frames.length} frames, ${seconds.toFixed(2)}s`);
  return { frames: frames.length, seconds };
}

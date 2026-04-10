import { useEffect, useMemo, useRef } from "react";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { DividerLabel } from "../Primitives/DividerLabel";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const HOURS_IN_DAY = 24;
const HOURS = Array.from({ length: HOURS_IN_DAY }, (_, i) => i);
const HOUR_BLOCKS = [
  { label: "12a-7a", hours: HOURS.slice(0, 8) },
  { label: "8a-3p", hours: HOURS.slice(8, 16) },
  { label: "4p-11p", hours: HOURS.slice(16, HOURS_IN_DAY) },
] as const;
const HOUR_BLOCKS_12 = [
  { label: "12a-11a", hours: HOURS.slice(0, 12) },
  { label: "12p-11p", hours: HOURS.slice(12, HOURS_IN_DAY) },
] as const;

function hourIndex(day: number, hour: number) {
  return day * HOURS_IN_DAY + hour;
}

function formatHour12(hour24: number) {
  const normalized = ((hour24 % 24) + 24) % 24;
  const period = normalized < 12 ? "a" : "p";
  const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${hour12}${period}`;
}

export function ScheduleGrid({
  mask,
  onChange,
  disabled,
  overlapMask,
  forceRows12 = false,
}: {
  mask: boolean[];
  onChange: (day: number, hour: number, value: boolean) => void;
  disabled: boolean;
  overlapMask?: boolean[];
  forceRows12?: boolean;
}) {
  const screenSize = useMediaQuery();
  const hourButtonSize =
    screenSize === ScreenSize.Phone ? 30 : screenSize === ScreenSize.Tablet ? 27 : 28;
  const hourButtonFontSize =
    screenSize === ScreenSize.Phone ? 12 : screenSize === ScreenSize.Tablet ? 11 : 10;
  const cellSnapRadius = hourButtonSize;

  const isDraggingRef = useRef(false);
  const dragValueRef = useRef(true);
  const dragAnchorIndexRef = useRef<number | null>(null);
  const dragAnchorDayRef = useRef<number | null>(null);
  const dragAnchorHourRef = useRef<number | null>(null);
  const dragAppliedRangeRef = useRef<Set<number>>(new Set());
  const maskRef = useRef(mask);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    maskRef.current = mask;
  }, [mask]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    function onPointerUp() {
      isDraggingRef.current = false;
      dragAnchorIndexRef.current = null;
      dragAnchorDayRef.current = null;
      dragAnchorHourRef.current = null;
      dragAppliedRangeRef.current = new Set<number>();
    }
    window.addEventListener("pointerup", onPointerUp);
    return () => window.removeEventListener("pointerup", onPointerUp);
  }, []);

  const rowBlocks = useMemo(() => {
    if (forceRows12) {
      return HOUR_BLOCKS_12;
    }
    if (screenSize === ScreenSize.Phone) {
      return HOUR_BLOCKS;
    }
    return HOUR_BLOCKS_12;
  }, [screenSize, forceRows12]);

  const hasConflict = useMemo(() => {
    if (!overlapMask?.length) return false;
    for (let i = 0; i < 168; i += 1) {
      if (Boolean(mask[i]) && Boolean(overlapMask[i])) return true;
    }
    return false;
  }, [mask, overlapMask]);

  function applyDragRange(currentIndex: number) {
    const anchor = dragAnchorIndexRef.current;
    if (anchor === null) return;

    const start = Math.min(anchor, currentIndex);
    const end = Math.max(anchor, currentIndex);
    const nextRange = new Set<number>();
    for (let i = start; i <= end; i += 1) {
      nextRange.add(i);
    }

    const previousRange = dragAppliedRangeRef.current;
    previousRange.forEach((idx) => {
      if (!nextRange.has(idx)) {
        const day = Math.floor(idx / HOURS_IN_DAY);
        const hour = idx % HOURS_IN_DAY;
        onChangeRef.current(day, hour, !dragValueRef.current);
      }
    });

    nextRange.forEach((idx) => {
      const day = Math.floor(idx / HOURS_IN_DAY);
      const hour = idx % HOURS_IN_DAY;
      onChangeRef.current(day, hour, dragValueRef.current);
    });

    dragAppliedRangeRef.current = nextRange;
  }

  function clearDragRange() {
    const previousRange = dragAppliedRangeRef.current;
    previousRange.forEach((idx) => {
      const day = Math.floor(idx / HOURS_IN_DAY);
      const hour = idx % HOURS_IN_DAY;
      onChangeRef.current(day, hour, !dragValueRef.current);
    });
    dragAppliedRangeRef.current = new Set<number>();
  }

  function pointerPastAnchor(x: number, y: number) {
    const day = dragAnchorDayRef.current;
    const hour = dragAnchorHourRef.current;
    if (day === null || hour === null) return false;
    const anchorEl = document.querySelector<HTMLElement>(`[data-day="${day}"][data-hour="${hour}"]`);
    if (!anchorEl) return false;
    const rect = anchorEl.getBoundingClientRect();
    const pad = 2;
    return x < rect.left - pad || x > rect.right + pad || y < rect.top - pad || y > rect.bottom + pad;
  }

  function getCell(x: number, y: number): { day: number; hour: number } | null {
    const elements = document.elementsFromPoint(x, y) as HTMLElement[];
    for (const el of elements) {
      const cellEl = el.closest("[data-day][data-hour]") as HTMLElement | null;
      if (!cellEl) continue;
      const dayStr = cellEl.dataset.day;
      const hourStr = cellEl.dataset.hour;
      if (dayStr !== undefined && hourStr !== undefined) {
        return { day: Number(dayStr), hour: Number(hourStr) };
      }
    }

    let nearestDay = -1;
    let nearestHour = -1;
    let nearestDist2 = Number.POSITIVE_INFINITY;
    const buttons = document.querySelectorAll<HTMLElement>("[data-day][data-hour]");
    buttons.forEach((btn) => {
      const rect = btn.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = cx - x;
      const dy = cy - y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 < nearestDist2) {
        nearestDay = Number(btn.dataset.day);
        nearestHour = Number(btn.dataset.hour);
        nearestDist2 = dist2;
      }
    });

    if (nearestDay < 0 || nearestHour < 0) return null;
    return nearestDist2 <= cellSnapRadius * cellSnapRadius
      ? { day: nearestDay, hour: nearestHour }
      : null;
  }

  const renderHourButton = (dayLabel: string, dayIndex: number, hour: number) => {
    const idx = hourIndex(dayIndex, hour);
    const active = Boolean(mask[idx]);
    const blockIndex = Math.floor(hour / 8);
    const overlap = Boolean(overlapMask?.[idx]);
    const palette =
      blockIndex === 0
        ? {
            inactiveBg: "rgba(184, 134, 11, 0.14)",
            activeBg: "#B8860B",
            borderColor: "rgba(184, 134, 11, 0.58)",
            textColor: "#7a5700",
          }
        : blockIndex === 1
        ? {
            inactiveBg: "rgba(213, 72, 158, 0.14)",
            activeBg: "#D5489E",
            borderColor: "rgba(213, 72, 158, 0.62)",
            textColor: "#8c1f63",
          }
        : {
            inactiveBg: "rgba(22, 120, 72, 0.14)",
            activeBg: "#167848",
            borderColor: "rgba(22, 120, 72, 0.58)",
            textColor: "#0c4a2e",
          };
    return (
      <button
        key={`${dayLabel}-${hour}`}
        type="button"
        disabled={disabled}
        data-day={dayIndex}
        data-hour={hour}
        title={`${dayLabel} ${formatHour12(hour)}`}
        style={{
          width: hourButtonSize,
          height: hourButtonSize,
          borderRadius: 4,
          border: `1px solid ${palette.borderColor}`,
          background: active ? palette.activeBg : palette.inactiveBg,
          color: active ? "#fff" : palette.textColor,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: hourButtonFontSize,
          lineHeight: 1,
          padding: 0,
          position: "relative",
          userSelect: "none",
          WebkitUserSelect: "none",
          pointerEvents: disabled ? "none" : "auto",
        }}
      >
        {overlap && active && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 1,
              left: "50%",
              transform: "translateX(-50%)",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#ffd1eb",
              border: "1px solid #b10f6b",
              pointerEvents: "none",
            }}
          />
        )}
        {formatHour12(hour)}
      </button>
    );
  };

  return (
    <div
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        if (disabled) return;
        const cell = getCell(e.clientX, e.clientY);
        if (!cell) return;
        e.preventDefault();
        isDraggingRef.current = true;
        const idx = cell.day * HOURS_IN_DAY + cell.hour;
        dragAnchorIndexRef.current = idx;
        dragAnchorDayRef.current = cell.day;
        dragAnchorHourRef.current = cell.hour;
        dragValueRef.current = !maskRef.current[idx];
        applyDragRange(idx);
      }}
      onPointerMove={(e) => {
        if (!isDraggingRef.current || disabled) return;
        const cell = getCell(e.clientX, e.clientY);
        if (!cell) {
          if (pointerPastAnchor(e.clientX, e.clientY)) {
            clearDragRange();
          }
          return;
        }
        e.preventDefault();
        const idx = cell.day * HOURS_IN_DAY + cell.hour;
        applyDragRange(idx);
      }}
      onPointerUp={() => {
        isDraggingRef.current = false;
        dragAnchorIndexRef.current = null;
        dragAnchorDayRef.current = null;
        dragAnchorHourRef.current = null;
        dragAppliedRangeRef.current = new Set<number>();
      }}
      onPointerCancel={() => {
        isDraggingRef.current = false;
        dragAnchorIndexRef.current = null;
        dragAnchorDayRef.current = null;
        dragAnchorHourRef.current = null;
        dragAppliedRangeRef.current = new Set<number>();
      }}
    >
      <Stack gap="xs">
        {overlapMask && (
          <Stack gap="xs">
            <DividerLabel label="Premium Conflict Indicator" />
            <Row gap="xs" align="center" justify="end">
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: hasConflict ? "#ff5ca8" : "transparent",
                  border: "1px solid #b10f6b",
                  display: "inline-block",
                }}
              />
              <Text.Body size="xs" color="muted">Dot = overlap exists</Text.Body>
            </Row>
          </Stack>
        )}
        {DAYS.map((dayLabel, dayIndex) => (
          <Stack
            key={dayLabel}
            gap="xs"
            style={{
              paddingTop: dayIndex === 0 ? 0 : 6,
              borderTop: dayIndex === 0 ? "none" : "1px solid var(--colors-border)",
            }}
          >
            <DividerLabel label={dayLabel} />
            <Stack gap="xs" style={{ minWidth: 0, alignItems: "center" }}>
              {rowBlocks.map((block) => (
                <Row key={`${dayLabel}-${block.label}`} gap="xs" wrap={false} justify="center">
                  {block.hours.map((hour) => renderHourButton(dayLabel, dayIndex, hour))}
                </Row>
              ))}
            </Stack>
          </Stack>
        ))}
        {overlapMask && (
          <Text.Body size="xs" color="muted">
            Pink dot above hour = overlap with premium. Top dot filled = has any overlap.
          </Text.Body>
        )}
      </Stack>
    </div>
  );
}

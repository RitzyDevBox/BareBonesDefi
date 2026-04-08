import { useEffect, useMemo, useRef, useState } from "react";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { Input } from "../BasicComponents";
import { NumberInput } from "../Inputs/NumberInput";
import { ButtonSecondary } from "../Button/ButtonPrimary";
import { ScreenSize, useMediaQuery } from "../../hooks/useMediaQuery";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const HOURS_IN_DAY = 24;
const DAYS_IN_WEEK = 7;
const HOURS = Array.from({ length: HOURS_IN_DAY }, (_, i) => i);
export const WEEK_HOURS = DAYS_IN_WEEK * HOURS_IN_DAY;
const HOUR_BLOCKS = [
  { label: "12a-7a", hours: HOURS.slice(0, 8) },
  { label: "8a-3p", hours: HOURS.slice(8, 16) },
  { label: "4p-11p", hours: HOURS.slice(16, HOURS_IN_DAY) },
] as const;
const HOUR_BLOCKS_12 = [
  { label: "12a-11a", hours: HOURS.slice(0, 12) },
  { label: "12p-11p", hours: HOURS.slice(12, HOURS_IN_DAY) },
] as const;

export interface WeeklyPremiumMaskDraft {
  id: string;
  label: string;
  multiplier: string;
  mask: boolean[];
}

interface WeeklyScheduleConfiguratorProps {
  canEdit: boolean;
  premiumRows: WeeklyPremiumMaskDraft[];
  onPremiumRowsChange: (rows: WeeklyPremiumMaskDraft[]) => void;
}

function hourIndex(day: number, hour: number) {
  return day * HOURS_IN_DAY + hour;
}

function cloneMask(mask: boolean[]) {
  const next = new Array<boolean>(WEEK_HOURS).fill(false);
  for (let i = 0; i < Math.min(mask.length, WEEK_HOURS); i += 1) next[i] = Boolean(mask[i]);
  return next;
}

function countMaskHours(mask: boolean[]) {
  return mask.reduce((acc, bit) => (bit ? acc + 1 : acc), 0);
}

function formatHour12(hour24: number) {
  const normalized = ((hour24 % 24) + 24) % 24;
  const period = normalized < 12 ? "a" : "p";
  const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${hour12}${period}`;
}

function buildMask(mutator: (mask: boolean[]) => void) {
  const mask = new Array<boolean>(WEEK_HOURS).fill(false);
  mutator(mask);
  return mask;
}

export function buildWeekendMask() {
  return buildMask((mask) => {
    for (let i = 120; i < WEEK_HOURS; i += 1) {
      mask[i] = true;
    }
  });
}

export function buildNightMask22to23EachDay() {
  return buildMask((mask) => {
    for (let day = 0; day < DAYS_IN_WEEK; day += 1) {
      for (let hour = 0; hour <= 5; hour += 1) {
        mask[hourIndex(day, hour)] = true;
      }
      mask[hourIndex(day, 22)] = true;
      mask[hourIndex(day, 23)] = true;
    }
  });
}

export function createDefaultWeeklyPremiumRows(): WeeklyPremiumMaskDraft[] {
  return [
    {
      id: "weekly-premium-night",
      label: "Night 22:00-06:00",
      multiplier: "1.25",
      mask: buildNightMask22to23EachDay(),
    },
    {
      id: "weekly-premium-weekend",
      label: "Weekend",
      multiplier: "1.5",
      mask: buildWeekendMask(),
    },
  ];
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
  const compact = screenSize !== ScreenSize.Desktop;
  const hourButtonSize = compact ? 24 : 28;
  const cellSnapRadius = hourButtonSize;

  const isDraggingRef = useRef(false);
  const dragValueRef = useRef(true);
  const dragAnchorIndexRef = useRef<number | null>(null);
  const dragAnchorDayRef = useRef<number | null>(null);
  const dragAnchorHourRef = useRef<number | null>(null);
  const dragAppliedRangeRef = useRef<Set<number>>(new Set());
  const maskRef = useRef(mask);
  const onChangeRef = useRef(onChange);

  useEffect(() => { maskRef.current = mask; }, [mask]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // End drag when pointer is released anywhere
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
    for (let i = 0; i < WEEK_HOURS; i += 1) {
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
    // Cells that are no longer in range are forced back to opposite of drag target.
    previousRange.forEach((idx) => {
      if (!nextRange.has(idx)) {
        const day = Math.floor(idx / HOURS_IN_DAY);
        const hour = idx % HOURS_IN_DAY;
        onChangeRef.current(day, hour, !dragValueRef.current);
      }
    });

    // Cells in range are set to drag target.
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

  // Find the button cell at a viewport coordinate
  // If the pointer is in a gap between cells, snap to nearest visible cell.
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
    // Radius tolerance is derived from current button size so it adapts with UI changes.
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
          fontSize: 10,
          lineHeight: 1,
          padding: 0,
          position: "relative",
          userSelect: "none",
          WebkitUserSelect: "none",
          // Let the container's pointer handlers manage interaction
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
        // Prevents scroll start and simulated mouse events on touch
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
        // Prevents scroll while painting
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
          <Row gap="xs" align="center">
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
            <Text.Body size="xs" color="muted">
              Premium conflict indicator
            </Text.Body>
          </Row>
        )}
        {DAYS.map((dayLabel, dayIndex) => (
          <Row
            key={dayLabel}
            gap="xs"
            align="center"
            wrap
            style={{
              paddingTop: dayIndex === 0 ? 0 : 6,
              borderTop: dayIndex === 0 ? "none" : "1px solid var(--colors-border)",
            }}
          >
            <div style={{ width: 44 }}>
              <Text.Body size="xs" color="muted">{dayLabel}</Text.Body>
            </div>
            <Stack gap="xs" style={{ minWidth: 0 }}>
              {rowBlocks.map((block) => (
                <Row key={`${dayLabel}-${block.label}`} gap="xs" wrap={false}>
                  {block.hours.map((hour) => renderHourButton(dayLabel, dayIndex, hour))}
                </Row>
              ))}
            </Stack>
          </Row>
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

export function WeeklyScheduleConfigurator({
  canEdit,
  premiumRows,
  onPremiumRowsChange,
}: WeeklyScheduleConfiguratorProps) {
  const [selectedId, setSelectedId] = useState<string>(premiumRows[0]?.id ?? "");

  const selected = useMemo(
    () => premiumRows.find((row) => row.id === selectedId) ?? premiumRows[0] ?? null,
    [premiumRows, selectedId]
  );

  const selectedIndex = useMemo(
    () => premiumRows.findIndex((row) => row.id === selected?.id),
    [premiumRows, selected]
  );

  const selectedOverlapMask = useMemo(() => {
    if (!selected) return new Array<boolean>(WEEK_HOURS).fill(false);
    const otherMasks = premiumRows
      .filter((row) => row.id !== selected.id)
      .map((row) => row.mask);

    const overlap = new Array<boolean>(WEEK_HOURS).fill(false);
    for (let i = 0; i < WEEK_HOURS; i += 1) {
      if (!selected.mask[i]) continue;
      if (otherMasks.some((m) => Boolean(m[i]))) {
        overlap[i] = true;
      }
    }
    return overlap;
  }, [premiumRows, selected]);

  // Auto-migrate older default night preset (22:00-24:00 only = 14h/week)
  // to the intended 22:00-06:00 mask (=56h/week).
  useEffect(() => {
    const nightRow = premiumRows.find((row) => row.id === "weekly-premium-night");
    if (!nightRow) return;

    const currentHours = countMaskHours(nightRow.mask);
    if (currentHours !== 14) return;

    onPremiumRowsChange(
      premiumRows.map((row) =>
        row.id === "weekly-premium-night"
          ? {
              ...row,
              label: "Night 22:00-06:00",
              mask: buildNightMask22to23EachDay(),
            }
          : row
      )
    );
  }, [premiumRows, onPremiumRowsChange]);

  function updatePremiumRow(id: string, patch: Partial<WeeklyPremiumMaskDraft>) {
    onPremiumRowsChange(premiumRows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function setSelectedPremiumHour(day: number, hour: number, value: boolean) {
    if (!selected) return;
    const idx = hourIndex(day, hour);
    const nextMask = cloneMask(selected.mask);
    nextMask[idx] = value;
    updatePremiumRow(selected.id, { mask: nextMask });
  }

  function addPremiumRow() {
    const id = `weekly-premium-${Date.now()}-${Math.random()}`;
    const next: WeeklyPremiumMaskDraft = {
      id,
      label: `Premium ${premiumRows.length + 1}`,
      multiplier: "1.25",
      mask: new Array<boolean>(WEEK_HOURS).fill(false),
    };
    onPremiumRowsChange([...premiumRows, next]);
    setSelectedId(id);
  }

  function removePremiumRow(id: string) {
    if (premiumRows.length <= 1) return;
    const next = premiumRows.filter((row) => row.id !== id);
    onPremiumRowsChange(next);
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? "");
    }
  }

  function resetToDefaults() {
    const defaults = createDefaultWeeklyPremiumRows();
    onPremiumRowsChange(defaults);
    setSelectedId(defaults[0]?.id ?? "");
  }

  function clearSelectedSchedule() {
    if (!selected) return;
    updatePremiumRow(selected.id, { mask: new Array<boolean>(WEEK_HOURS).fill(false) });
  }

  return (
    <Stack
      gap="sm"
      style={{
        border: "1px solid var(--colors-border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--spacing-sm)",
      }}
    >
      <Text.Label>Weekly Schedule</Text.Label>

      <Row gap="sm" wrap align="center">
        <Text.Body size="sm" color="muted">Premium Masks</Text.Body>
        <ButtonSecondary style={{ flex: 0 }} onClick={addPremiumRow} disabled={!canEdit}>+ Add Premium</ButtonSecondary>
        <ButtonSecondary style={{ flex: 0 }} onClick={resetToDefaults} disabled={!canEdit}>Reset Defaults</ButtonSecondary>
      </Row>

      <Row gap="sm" wrap>
        {premiumRows.map((row) => {
          const selectedRow = row.id === selected?.id;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelectedId(row.id)}
              style={{
                border: "1px solid var(--colors-border)",
                borderRadius: 8,
                padding: "6px 10px",
                background: selectedRow ? "var(--colors-primary)" : "var(--colors-background)",
                color: selectedRow ? "#fff" : "var(--colors-text-main)",
                cursor: "pointer",
              }}
            >
              {row.label} ({countMaskHours(row.mask)}h)
            </button>
          );
        })}
      </Row>

      {selected && selectedIndex >= 0 && (
        <Stack gap="sm" style={{ border: "1px dashed var(--colors-border)", borderRadius: 8, padding: "var(--spacing-sm)" }}>
          <Row gap="sm" wrap align="end">
            <Stack style={{ minWidth: 180 }}>
              <Text.Body size="sm" color="muted">Label</Text.Body>
              <Input
                value={selected.label}
                onChange={(e) => updatePremiumRow(selected.id, { label: e.target.value })}
                disabled={!canEdit}
              />
            </Stack>
            <Stack style={{ minWidth: 180 }}>
              <Text.Body size="sm" color="muted">Multiplier</Text.Body>
              <NumberInput
                value={selected.multiplier}
                onChange={(e) => updatePremiumRow(selected.id, { multiplier: (e.target as HTMLInputElement).value })}
                allowDecimal
                disabled={!canEdit}
              />
            </Stack>
            <ButtonSecondary
              style={{ flex: 0, minWidth: 120 }}
              onClick={() => removePremiumRow(selected.id)}
              disabled={!canEdit || premiumRows.length <= 1}
            >
              Delete
            </ButtonSecondary>
            <ButtonSecondary
              style={{ flex: 0, minWidth: 140 }}
              onClick={clearSelectedSchedule}
              disabled={!canEdit}
            >
              Clear Schedule
            </ButtonSecondary>
          </Row>

          <ScheduleGrid
            mask={selected.mask}
            onChange={setSelectedPremiumHour}
            disabled={!canEdit}
            overlapMask={selectedOverlapMask}
          />
        </Stack>
      )}
    </Stack>
  );
}

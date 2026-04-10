import { useMemo, useState } from "react";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { Input } from "../BasicComponents";
import { NumberInput } from "../Inputs/NumberInput";
import { ButtonSecondary } from "../Button/ButtonPrimary";
import { IconButton } from "../Button/IconButton";
import { ScheduleGrid } from "../Schedule/ScheduleGrid";

const HOURS_IN_DAY = 24;
const DAYS_IN_WEEK = 7;
export const WEEK_HOURS = DAYS_IN_WEEK * HOURS_IN_DAY;

export interface WeeklyPremiumMaskDraft {
  id: string;
  label: string;
  multiplier: string;
  mask: boolean[];
}

interface WeeklyScheduleConfiguratorProps {
  canEdit: boolean;
  premiumRows: WeeklyPremiumMaskDraft[];
  onPremiumRowsChange: (
    rows:
      | WeeklyPremiumMaskDraft[]
      | ((prev: WeeklyPremiumMaskDraft[]) => WeeklyPremiumMaskDraft[])
  ) => void;
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
      id: `weekly-premium-default-${Date.now()}`,
      label: "Premium 1",
      multiplier: "1.25",
      mask: new Array<boolean>(WEEK_HOURS).fill(false),
    },
  ];
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

  function updatePremiumRow(id: string, patch: Partial<WeeklyPremiumMaskDraft>) {
    onPremiumRowsChange((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function setSelectedPremiumHour(day: number, hour: number, value: boolean) {
    if (!selectedId) return;
    const idx = hourIndex(day, hour);
    onPremiumRowsChange((prev) => {
      const selectedRowIndex = prev.findIndex((row) => row.id === selectedId);
      if (selectedRowIndex < 0) return prev;

      const target = prev[selectedRowIndex];
      const nextMask = cloneMask(target.mask);
      nextMask[idx] = value;

      const next = [...prev];
      next[selectedRowIndex] = { ...target, mask: nextMask };
      return next;
    });
  }

  function addPremiumRow() {
    const id = `weekly-premium-${Date.now()}-${Math.random()}`;
    const next: WeeklyPremiumMaskDraft = {
      id,
      label: `Premium ${premiumRows.length + 1}`,
      multiplier: "1.25",
      mask: new Array<boolean>(WEEK_HOURS).fill(false),
    };
    onPremiumRowsChange((prev) => [...prev, next]);
    setSelectedId(id);
  }

  function removePremiumRow(id: string) {
    onPremiumRowsChange((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((row) => row.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? "");
      }
      return next;
    });
  }

  function clearSelectedSchedule() {
    if (!selectedId) return;
    onPremiumRowsChange((prev) =>
      prev.map((row) =>
        row.id === selectedId
          ? { ...row, mask: new Array<boolean>(WEEK_HOURS).fill(false) }
          : row
      )
    );
  }

  function renderEmbeddedCardLabel(label: string) {
    return (
      <Text.Label
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "var(--colors-surface)",
          padding: "0 var(--spacing-sm)",
          whiteSpace: "nowrap",
          lineHeight: 1,
        }}
      >
        {label}
      </Text.Label>
    );
  }

  return (
    <Stack
      gap="sm"
      style={{
        position: "relative",
        border: "1px solid var(--colors-border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--spacing-sm)",
        paddingTop: "calc(var(--spacing-sm) + 2px)",
      }}
    >
      {renderEmbeddedCardLabel("Weekly Schedule")}

      <Row gap="sm" wrap justify="end" align="center">
        <ButtonSecondary
          style={{ flex: 0, minWidth: 170, whiteSpace: "nowrap", lineHeight: 1 }}
          onClick={addPremiumRow}
          disabled={!canEdit}
        >
          Add Hours Premium
        </ButtonSecondary>
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
        <Stack gap="sm">
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
            <IconButton
              size="sm"
              shape="square"
              aria-label="Delete premium row"
              onClick={() => removePremiumRow(selected.id)}
              disabled={!canEdit || premiumRows.length <= 1}
            >
              🗑
            </IconButton>
            <ButtonSecondary
              style={{ flex: 0, minWidth: 140 }}
              onClick={clearSelectedSchedule}
              disabled={!canEdit}
            >
              Clear
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

import { useState } from "react";
import { Modal } from "../components/Modal/Modal";
import {
  ButtonPrimary,
  Card,
  CardContent,
  Text,
} from "../components/BasicComponents";

export function TestPage() {
  const [open, setOpen] = useState(false);

  // grid state
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);

  // build grid data
  const cells = Array.from({ length: rows * cols });

  return (
    <Card style={{ maxWidth: "min(90vw, 600px)", margin: "0 auto" }}>
      <CardContent>
        <Text.Title>Modal Resize Test</Text.Title>

        <ButtonPrimary onClick={() => setOpen(true)}>
          Open Modal
        </ButtonPrimary>
      </CardContent>

      <Modal
        isOpen={open}
        title="Auto Resize Test"
        onClose={() => setOpen(false)}
      >
        {/* GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 60px)`,
            gap: "8px",
          }}
        >
          {cells.map((_, i) => (
            <div
              key={i}
              style={{
                width: "60px",
                height: "60px",
                background: "var(--colors-primary)",
                borderRadius: "var(--radius-md)",
              }}
            />
          ))}
        </div>

        {/* CONTROLS */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "16px",
            flexWrap: "wrap",
          }}
        >
          <ButtonPrimary
            style={{ width: "auto" }}
            onClick={() => setRows((r) => r + 1)}
          >
            Add Row
          </ButtonPrimary>

          <ButtonPrimary
            style={{ width: "auto" }}
            onClick={() => setRows((r) => Math.max(1, r - 1))}
          >
            Remove Row
          </ButtonPrimary>

          <ButtonPrimary
            style={{ width: "auto" }}
            onClick={() => setCols((c) => c + 1)}
          >
            Add Column
          </ButtonPrimary>

          <ButtonPrimary
            style={{ width: "auto" }}
            onClick={() => setCols((c) => Math.max(1, c - 1))}
          >
            Remove Column
          </ButtonPrimary>
        </div>
      </Modal>
    </Card>
  );
}

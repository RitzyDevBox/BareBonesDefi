import { ReactNode } from "react";
import { Stack, Row, Surface } from "../Primitives";
import { Text } from "../Primitives/Text";

export interface TabDefinition<T extends number> {
  id: T;
  label: string;
  content: ReactNode;
}

interface TabsProps<T extends number> {
  tabs: readonly TabDefinition<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
}

export function Tabs<T extends number>({
  tabs,
  activeTab,
  onChange,
}: TabsProps<T>) {
  return (
    <Stack gap="none">
      {/* TAB BAR */}
      <Row
        style={{
          borderBottom: "1px solid var(--border)",
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <Surface
              key={tab.id}
              clickable
              onClick={() => onChange(tab.id)}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                borderTop: "1px solid var(--border)",
                borderLeft: "1px solid var(--border)",
                borderRight: "1px solid var(--border)",
                borderBottom: isActive
                  ? "1px solid transparent"
                  : "1px solid var(--border)",
                background: isActive
                  ? "var(--surface)"
                  : "var(--surface-muted)",
                position: "relative",
                top: isActive ? "1px" : "0px",
              }}
            >
              <Text.Body weight={isActive ? "bold" : "normal"}>
                {tab.label}
              </Text.Body>
            </Surface>
          );
        })}
      </Row>

      {/* CONTENT */}
      <Surface
        style={{
          border: "1px solid var(--border)",
          borderTop: "none",
          padding: "16px",
        }}
      >
        {tabs.find((t) => t.id === activeTab)?.content}
      </Surface>
    </Stack>
  );
}

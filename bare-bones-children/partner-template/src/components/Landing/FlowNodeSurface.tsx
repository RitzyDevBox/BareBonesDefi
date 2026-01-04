import { ReactNode } from "react";
import { FlowNodePosition } from "./types";
import { Box } from "../BasicComponents";
import { Surface } from "../Primitives";

type Props = {
  position: FlowNodePosition;
  children: ReactNode;
};

export function FlowNodeSurface({ position, children }: Props) {
  let justifyContent: React.CSSProperties["justifyContent"] = "center";

  if (position === "left") {
    justifyContent = "flex-start";
  } else if (position === "right") {
    justifyContent = "flex-end";
  }

  return (
    <Box
      style={{
        display: "flex",
        justifyContent,
        width: "100%",
      }}
    >
      <Surface
        style={{
          maxWidth: 420,
          padding: "var(--spacing-lg)",
        }}
      >
        {children}
      </Surface>
    </Box>
  );
}

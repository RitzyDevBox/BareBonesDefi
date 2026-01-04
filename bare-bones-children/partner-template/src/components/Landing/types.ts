import { ReactNode } from "react";

export type VerticalListFlowLayout =
  | "centered"
  | "staggered";

export type FlowNodePosition =
  | "left"
  | "center"
  | "right";

export type VerticalFlowItem = {
  id: string;
  content: ReactNode;
};

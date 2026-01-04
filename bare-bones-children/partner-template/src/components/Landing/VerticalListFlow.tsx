import { Stack } from "../Primitives";
import {
  VerticalFlowItem,
  VerticalListFlowLayout,
  FlowNodePosition,
} from "./types";
import { FlowNodeSurface } from "./FlowNodeSurface";

type Props = {
  items: VerticalFlowItem[];
  layout: VerticalListFlowLayout;
};

export function VerticalListFlow({ items, layout }: Props) {
  return (
    <Stack gap="xl">
      {items.map((item, index) => {
        let position: FlowNodePosition = "center";

        if (layout === "staggered") {
          position = index % 2 === 0 ? "left" : "right";
        }

        return (
          <FlowNodeSurface
            key={item.id}
            position={position}
          >
            {item.content}
          </FlowNodeSurface>
        );
      })}
    </Stack>
  );
}

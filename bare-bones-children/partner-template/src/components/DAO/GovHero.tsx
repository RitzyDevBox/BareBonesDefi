import { ReactNode } from "react";
import { Row } from "../Primitives";
import { Text } from "../Primitives/Text";

type Props = {
  crumb: string;
  title: string;
  right?: ReactNode;
};

export function GovHero({ crumb, title, right }: Props) {
  return (
    <Row
      justify="between"
      align="end"
      wrap
      style={{
        borderBottom: "1px solid var(--colors-border)",
        paddingBottom: 28,
        gap: 16,
      }}
    >
      <div>
        <Text.Body
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            marginBottom: 10,
            display: "block",
          }}
          color="label"
        >
          {crumb}
        </Text.Body>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(36px, 5vw, 52px)",
            fontWeight: 400,
            letterSpacing: "-0.01em",
            lineHeight: 1.05,
            color: "var(--colors-text-main)",
          }}
        >
          {title}
        </h1>
      </div>
      {right ? <Row gap="sm">{right}</Row> : null}
    </Row>
  );
}

import { Row } from "../Primitives";
import { Text } from "../Primitives/Text";

interface LoaderProps {
  label?: string;
  size?: number;
  inline?: boolean;
  color?: string;
  kind?: "default" | "table";
}

export function Loader({
  label,
  size = 16,
  inline = false,
  color = "currentColor",
  kind = "default",
}: LoaderProps) {
  const effectiveSize = kind === "table" ? Math.max(size, 28) : size;
  const spinner = (
    <svg
      width={effectiveSize}
      height={effectiveSize}
      viewBox="0 0 24 24"
      aria-hidden
      style={{ display: "block", color }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="3"
      />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );

  if (inline) {
    return (
      <Row gap="xs" align="center" wrap={false}>
        {spinner}
        {label ? <Text.Body size="sm">{label}</Text.Body> : null}
      </Row>
    );
  }

  return (
    <Row
      gap={kind === "table" ? "md" : "sm"}
      align="center"
      justify="center"
      style={{
        width: "100%",
        minHeight: kind === "table" ? 96 : undefined,
        padding: kind === "table" ? "var(--spacing-lg) 0" : undefined,
      }}
    >
      {spinner}
      {label ? <Text.Body color="muted" size={kind === "table" ? "sm" : undefined}>{label}</Text.Body> : null}
    </Row>
  );
}

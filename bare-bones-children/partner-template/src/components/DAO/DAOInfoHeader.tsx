import { useNavigate } from "react-router-dom";
import { CopyButton } from "../Button/Actions/CopyButton";
import { IconButton } from "../Button/IconButton";
import { Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { shortAddress } from "../../utils/formatUtils";
import { buildExplorerAddressLink } from "../../utils/explorerLinks";
import type { DaoGovernanceOverview } from "./types";
import type { ReactNode } from "react";

export type { DaoGovernanceOverview };

const ARROW_SVG_PROPS = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function ArrowLeft() {
  return (
    <svg {...ARROW_SVG_PROPS}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 5 5 12 12 19" />
    </svg>
  );
}

type Props = {
  daoName: string;
  governorAddress: string;
  backPath: string;
  showBackButton?: boolean;
  blockExplorerBase?: string;
  footerAction?: ReactNode;
};

export function DAOInfoHeader({
  daoName,
  governorAddress,
  backPath,
  showBackButton = true,
  blockExplorerBase,
  footerAction,
}: Props) {
  const navigate = useNavigate();
  const daoAddressUrl = buildExplorerAddressLink(governorAddress, blockExplorerBase);

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
            letterSpacing: "0.12em",
            marginBottom: 12,
            display: "block",
          }}
          color="label"
        >
          DAOs
        </Text.Body>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 400,
            letterSpacing: "-0.01em",
            lineHeight: 1.05,
            color: "var(--colors-text-main)",
          }}
        >
          {daoName}
        </h1>
        <Row gap="xs" style={{ alignItems: "center", marginTop: 8 }}>
          {daoAddressUrl ? (
            <a
              href={daoAddressUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--colors-primary)", fontFamily: "monospace", fontSize: 13 }}
            >
              {shortAddress(governorAddress)}
            </a>
          ) : (
            <Text.Body color="muted" style={{ fontFamily: "monospace", fontSize: 13 }}>
              {shortAddress(governorAddress)}
            </Text.Body>
          )}
          <CopyButton value={governorAddress} ariaLabel="Copy DAO address" />
        </Row>
      </div>

      <Row gap="sm" style={{ alignItems: "center" }}>
        {footerAction}
        {showBackButton && (
          <IconButton
            size="xl"
            shape="square"
            onClick={() => navigate(backPath)}
            title="Back to DAOs"
            aria-label="Back to DAOs"
          >
            <ArrowLeft />
          </IconButton>
        )}
      </Row>
    </Row>
  );
}

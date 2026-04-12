import { PageContainer } from "../components/PageWrapper/PageContainer";
import { HexGridFlow } from "../components/Landing/HexGridFlow";
import { HexPanel } from "../components/Landing/panels/HexPanel";
import { Text } from "../components/Primitives/Text";
import { useMediaQuery, ScreenSize } from "../hooks/useMediaQuery";
import { VerticalFlowItem } from "../components/Landing/types";

type LandingTile = {
    id: string;
    title: string;
    body: string;
};

const LANDING_TILES: LandingTile[] = [
    {
        id: "overview",
        title: "Overview",
        body: "Mission: build a shared foundation of common tools that helps teams launch and operate micro-startups.",
    },
    {
        id: "core-operations",
        title: "Core Ops",
        body: "Payment pipelines: which allow rules to process payments and configure payrolls.",
    },
    {
        id: "security-model",
        title: "Security",
        body: "Vaults: rule-based treasury controls to protect funds and create configurable policies that help prevent total fund loss, even if you lose your seed.",
    },
    {
        id: "architecture",
        title: "Architecture",
        body: "DAO LLC framework: gives small teams a way to form and manage DAO LLC-style organizations in a decentralized manner.",
    },
    {
        id: "roadmap",
        title: "Roadmap",
        body: "Foundation tools: practical modules to manage and assist with common team challenges without requiring massive infrastructure.",
    },
    {
        id: "account-abstraction",
        title: "4337 Accounts",
        body: "ERC-4337 support enables programmable smart accounts with owner-authorized controls and modular execution.",
    },
    {
        id: "dao-llc-operations",
        title: "DAO LLC Ops",
        body: "Structure teams with transparent governance, treasury controls, and operational workflows designed for DAO LLC-style entities.",
    },
    {
        id: "team-productivity",
        title: "Team Ops",
        body: "Built-in tooling helps small teams handle payroll, permissions, payments, and treasury coordination with minimal overhead.",
    },
    {
        id: "micro-startup-scale",
        title: "Startup Scale",
        body: "Start lean, stay decentralized, and expand safely with reusable infrastructure instead of rebuilding your stack from scratch.",
    },
];

export function LandingPage() {
  const screen = useMediaQuery();
  const isPhone = screen === ScreenSize.Phone;

  const columns = isPhone || screen === ScreenSize.Tablet ? 2 : 3;
  const hexSize = isPhone || screen === ScreenSize.Tablet ? 128 : 160;
  const contentScale = 1;
  const hexSpacing = 1.02;
  const titleSize = isPhone ? "sm" : undefined;

  const pageStyle = isPhone
    ? {
        maxWidth: "none",
        width: "100%",
      }
    : undefined;

  const items: VerticalFlowItem[] = LANDING_TILES.map((tile) => ({
    id: tile.id,
    content: (
      <HexPanel
        title={<Text.Title align="center" size={titleSize}>{tile.title}</Text.Title>}
        contentScale={contentScale}
      >
        <Text.Body align="center">{tile.body}</Text.Body>
      </HexPanel>
    ),
  }));


  return (
        <PageContainer style={pageStyle}>
      <HexGridFlow
        items={items}
        columns={columns}
        hexSize={hexSize}
        spacing={hexSpacing}
      />
    </PageContainer>
  );
}

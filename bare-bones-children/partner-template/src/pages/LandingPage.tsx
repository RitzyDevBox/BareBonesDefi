import { PageContainer } from "../components/PageWrapper/PageContainer";
import { HexGridFlow } from "../components/Landing/HexGridFlow";
import { HexPanel } from "../components/Landing/panels/HexPanel";
import { Text } from "../components/Primitives/Text";
import { useMediaQuery, ScreenSize } from "../hooks/useMediaQuery";
import { VerticalFlowItem } from "../components/Landing/types";

export function LandingPage() {
  const screen = useMediaQuery();

  // Layout knobs (keep simple for now)
  const columns =
    screen === ScreenSize.Phone ? 1 :
    screen === ScreenSize.Tablet ? 2 :
    3;

  const hexSize = 160;
  const contentScale = 1;
  const hexSpacing = 1.02;

  const items: VerticalFlowItem[] = [
    {
        id: "overview",
        content: (
        <HexPanel
            title={<Text.Title align="center">Overview</Text.Title>}
            contentScale={contentScale}
        >
            <Text.Body align="center">
            A minimal account-abstraction wallet framework built on Diamonds.
            Owner-authorized by default. No custody.
            </Text.Body>
        </HexPanel>
        ),
    },

    {
        id: "core-operations",
        content: (
        <HexPanel
            title={<Text.Title align="center">Core Operations</Text.Title>}
            contentScale={contentScale}
        >
            <Text.Body align="center">
            Deploy smart-contract wallets, send and receive ETH and ERC-20 tokens,
            wrap native assets, and execute batched transactions — all through a
            single owner-authorized smart account.
            </Text.Body>
        </HexPanel>
        ),
    },

    {
        id: "security-model",
        content: (
        <HexPanel
            title={<Text.Title align="center">Security Model</Text.Title>}
            contentScale={contentScale}
        >
            <Text.Body align="center">
            Every state change is explicitly authorized by the owner.
            Validation is enforced by default. No relayers. No automatic execution.
            </Text.Body>
        </HexPanel>
        ),
    },

    {
        id: "architecture",
        content: (
        <HexPanel
            title={<Text.Title align="center">Architecture</Text.Title>}
            contentScale={contentScale}
        >
            <Text.Body align="center">
            Diamond-based smart accounts with modular execution and validation,
            deployed through a factory for consistent, upgradeable structure.
            </Text.Body>
        </HexPanel>
        ),
    },

    {
        id: "roadmap",
        content: (
        <HexPanel
            title={<Text.Title align="center">Roadmap</Text.Title>}
            contentScale={contentScale}
        >
            <Text.Body align="center">
            Optional execution modules, custom authorization strategies,
            intent-based interactions, and deeper protocol integrations.
            </Text.Body>
        </HexPanel>
        ),
    },
    ];


  return (
    <PageContainer>
      <HexGridFlow
        items={items}
        columns={columns}
        hexSize={hexSize}
        spacing={hexSpacing}
      />
    </PageContainer>
  );
}

import { PageContainer } from "../components/PageWrapper/PageContainer";
import { Card, CardContent } from "../components/BasicComponents";
import { Stack } from "../components/Primitives";
import { useMediaQuery, ScreenSize } from "../hooks/useMediaQuery";
import { OrganizationCard, OrganizationCardProps } from "../components/Organizations/OrganizationCard";

type OrganizationMetadata = OrganizationCardProps & {
  id: string;
};

export const ORGANIZATION_PAGE_METADATA: OrganizationMetadata[] = [
  {
    id: "bare-bones",
    name: "Bare Bones DAO",
    description: "Minimal governance, maximal control.",
    logoUrl: "/logo.svg",
    links: {
      telegram: "https://t.me/barebonesdao",
      discord: "https://discord.gg/barebones",
      twitter: "https://x.com/barebonesdao",
    },
  },

  {
    id: "hyper-collective",
    name: "Hyper Collective",
    description: "Coordination layer for onchain ops.",
    logoUrl: "/logo.svg",
    links: {
      twitter: "https://x.com/hypercollective",
    },
  },

  {
    id: "atlas-protocol",
    name: "Atlas Protocol",
    description:
      "A modular execution framework for autonomous onchain agents, designed to scale coordination across DAOs, protocols, and teams.",
    logoUrl: "/logo.svg",
    links: {
      website: "https://atlas.example",
      twitter: "https://x.com/atlasprotocol",
      discord: "https://discord.gg/atlas",
    },
  },

  {
    id: "ghost-market",
    name: "Ghost Market",
    description:
      "Private coordination, public settlement. Ghost Market enables trust-minimized OTC and dark liquidity primitives.",
    logoUrl: "/logo.svg",
    links: {
      website: "https://ghost.example",
      telegram: "https://t.me/ghostmarket",
    },
  },

  {
    id: "hex-labs",
    name: "Hex Labs",
    description: "Research-driven smart contract engineering collective.",
    logoUrl: "/logo.svg",
    links: {},
  },

  {
    id: "sovereign-stack",
    name: "Sovereign Stack",
    description:
      "Infrastructure and tooling for fully sovereign organizations operating without centralized points of control.",
    logoUrl: "/logo.svg",
    links: {
      website: "https://sovereign.example",
      twitter: "https://x.com/sovereignstack",
      telegram: "https://t.me/sovereignstack",
      discord: "https://discord.gg/sovereign",
    },
  },

  {
    id: "delta-syndicate",
    name: "Delta Syndicate",
    description:
      "Capital formation and execution syndicate focused on early-stage onchain primitives.",
    logoUrl: "/logo.svg",
    links: {
      twitter: "https://x.com/deltasyndicate",
    },
  },
];



export function OrganizationPage() {
  const screen = useMediaQuery();

  const columns =
    screen === ScreenSize.Desktop ? 3 :
    screen === ScreenSize.Tablet ? 2 :
    1;

  return (
    <PageContainer>
      <Card>
        <CardContent>
          <Stack gap="lg">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: "var(--spacing-lg)",
              }}
            >
              {ORGANIZATION_PAGE_METADATA.map((org) => (
                <OrganizationCard
                  key={org.id}
                  name={org.name}
                  description={org.description}
                  logoUrl={org.logoUrl}
                  links={org.links}
                />
              ))}
            </div>
          </Stack>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

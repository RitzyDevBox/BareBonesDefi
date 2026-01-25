import { useNavigate } from "react-router-dom";
import { SocialKey, SOCIALS } from "../../assets/configs/socials";
import { Card, CardContent } from "../BasicComponents";
import { Logo } from "../Logo/Logo";
import { Stack, Row } from "../Primitives";
import { Text } from "../Primitives/Text";
import { ROUTES } from "../../routes";

type OrganizationLinks = Partial<Record<SocialKey, string>>;

export type OrganizationCardProps = {
  organizationId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  links?: OrganizationLinks;
};

export function OrganizationCard({
  organizationId,
  name,
  description,
  logoUrl,
  links,
}: OrganizationCardProps) {

  const navigate = useNavigate();

  function handleNavigate() {
    navigate(ROUTES.ORGANIZATION_DETAIL(organizationId));
  }

  return (
    <Card
      onClick={handleNavigate}
      style={{ cursor: "pointer" }}
    >
      <CardContent>
        <Stack gap="md">
          {/* Header */}
          <Row gap="md" align="center">
            {logoUrl && <Logo src={logoUrl} size={48} />}
            <Text.Title align="left">{name}</Text.Title>
          </Row>

          {/* Description */}
          {description && (
            <Text.Body color="muted">{description}</Text.Body>
          )}

          {/* Social links */}
          {links && (
            <Stack gap="xs">
              {(Object.keys(links) as SocialKey[]).map((key) => {
                const href = links[key];
                if (!href) return null;

                const social = SOCIALS[key];
                const display = getLinkDisplay(key, href)

                return (
                  <SocialLink
                    key={key}
                    display={display}
                    href={href}
                    label={social.label}
                    icon={social.icon}
                    color={social.color}
                  />
                );
              })}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function getLinkDisplay(key: SocialKey, href: string): string {
  try {
    const url = new URL(href);

    switch (key) {
      case "telegram":
      case "twitter":
        return "@" + url.pathname.replace("/", "");

      case "discord":
        return url.pathname.replace("/", "");

      case "website":
      default:
        return url.origin.replace(/^https?:\/\//, "");
    }
  } catch {
    return href;
  }
}


function SocialLink({
  href,
  display,
  label,
  icon,
  color,
}: {
  href: string;
  label: string;
  icon: string;
  display?: string;
  color?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "0.85rem",
        textDecoration: "none",
        color: "var(--colors-text-muted)",
        borderRadius: "var(--radius-sm)",
        transition: "background 120ms ease, color 120ms ease",

        // 🔑 allow truncation
        minWidth: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--colors-surfaceHover)";
        e.currentTarget.style.color =
          color || "var(--colors-text-main)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--colors-text-muted)";
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "6px",
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <img
          src={icon}
          alt={label}
          width={14}
          height={14}
          style={{ display: "block" }}
        />
      </div>

      {/* Truncated text */}
      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
        }}
        title={display ?? label} // hover shows full value
      >
        {display ?? label}
      </span>
    </a>
  );
}


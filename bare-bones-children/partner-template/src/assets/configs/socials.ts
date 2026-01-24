export type SocialKey = "telegram" | "discord" | "twitter" | "website";

type SocialConfig = {
  label: string;
  icon: string;
  color: string;
};

export const SOCIALS: Record<SocialKey, SocialConfig> = {
  telegram: {
    label: "Telegram",
    icon: "/telegram.svg",
    color: "#26A5E4",
  },

  discord: {
    label: "Discord",
    icon: "/discord.svg",
    color: "#5865F2",
  },

  twitter: {
    label: "X",
    icon: "/x.svg",
    color: "#000000",
  },

  website: {
    label: "Website",
    icon: "/website.svg",
    color: "", // neutral
  },
} as const;

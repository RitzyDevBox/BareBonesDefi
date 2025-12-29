import React from "react";
import { useAppTheme } from "../../themes/AppThemeProvider";


interface AppBackgroundProps {
  children: React.ReactNode;
}

export function AppBackground({ children }: AppBackgroundProps) {
  const theme = useAppTheme();
  const bg = theme.appBackground;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: bg.color,
        position: "relative",
        overflow: "hidden",
        color: "var(--colors-text-main)",
      }}
    >
      {/* Left background image */}
      {bg.leftImage && (
        <img
          src={bg.leftImage}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            opacity: bg.imageOpacity ?? 0.3,
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      )}

      {/* Right background image */}
      {bg.rightImage && (
        <img
          src={bg.rightImage}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            height: "100%",
            opacity: bg.imageOpacity ?? 0.3,
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      )}

      {/* App content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
        }}
      >
        {children}
      </div>
    </div>
  );
}

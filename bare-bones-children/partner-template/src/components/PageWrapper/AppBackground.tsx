import React from "react";
import { useAppTheme } from "../../themes/AppThemeProvider";

interface AppBackgroundProps {
  children: React.ReactNode;
}

export function AppBackground({ children }: AppBackgroundProps) {
  const theme = useAppTheme();
  const bg = theme.appBackground;

  const opacity = bg.imageOpacity ?? 0.3;

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
      {/* Full background image */}
      {bg.fullImage && (
        <img
          src={bg.fullImage}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity,
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      )}

      {/* Split background images (fallback mode) */}
      {!bg.fullImage && (
        <>
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
                opacity,
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          )}

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
                opacity,
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          )}
        </>
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

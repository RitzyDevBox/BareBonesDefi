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
    <>
      {/* BACKGROUND LAYER (out of layout) */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: bg.color,
          overflow: "hidden",
          zIndex: -1,
        }}
      >
        {/* Full background image */}
        {bg.fullImage && (
          <img
            src={bg.fullImage}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity,
              pointerEvents: "none",
              userSelect: "none",
              display: "block",
            }}
          />
        )}

        {/* Split background images */}
        {!bg.fullImage && (
          <>
            {bg.leftImage && (
              <img
                src={bg.leftImage}
                alt=""
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  opacity,
                  pointerEvents: "none",
                }}
              />
            )}

            {bg.rightImage && (
              <img
                src={bg.rightImage}
                alt=""
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  height: "100%",
                  opacity,
                  pointerEvents: "none",
                }}
              />
            )}
          </>
        )}
      </div>

      {/* APP CONTENT */}
      <div
        style={{
          minHeight: "100%",
          color: "var(--colors-text-main)",
          position: "relative",
        }}
      >
        {children}
      </div>
    </>
  );
}

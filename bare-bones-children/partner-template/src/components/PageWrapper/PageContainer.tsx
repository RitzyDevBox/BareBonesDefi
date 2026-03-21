import React from "react";

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  center?: boolean;
  style?: React.CSSProperties;
}

export function PageContainer({
  children,
  maxWidth = 720,
  center = false,
  style,
}: PageContainerProps) {
  return (
    <div
      style={{
        maxWidth,
        margin: "0 auto",
        width: "100%",
        display: center ? "flex" : undefined,
        justifyContent: center ? "center" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

import React from "react";

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  style?: React.CSSProperties;
}

export function PageContainer({
  children,
  maxWidth = 720,
  style,
}: PageContainerProps) {
  return (
    <div
      style={{
        maxWidth,
        margin: "0 auto",
        width: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

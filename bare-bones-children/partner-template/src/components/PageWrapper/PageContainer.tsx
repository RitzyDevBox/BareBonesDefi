import React from "react";

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
}

export function PageContainer({
  children,
  maxWidth = 720,
}: PageContainerProps) {
  return (
    <div
      style={{
        maxWidth,
        margin: "0 auto",
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}

import React from "react";
import { Box, Text } from "../BasicComponents";

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function FormField({ label, children, style }: FormFieldProps) {
  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-xs)",
        marginBottom: "var(--spacing-md)",
        ...style,
      }}
    >
      <Text.Label>{label}</Text.Label>
      {children}
    </Box>
  );
}

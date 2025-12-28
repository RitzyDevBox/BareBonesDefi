import React, { useState } from "react";

interface ImageWithFallbackProps {
  src?: string;
  alt?: string;
  fallbackText: string;
  size?: number;
  title?: string;
  style?: React.CSSProperties;
}

export function ImageWithFallback({
  src,
  alt,
  fallbackText,
  size = 18,
  title,
  style,
}: ImageWithFallbackProps) {
  const [errored, setErrored] = useState(false);

  const showFallback = !src || errored;

  if (showFallback) {
    const text = fallbackText.slice(0, 3).toUpperCase();

    return (
      <div
        title={title}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--colors-border)",
          color: "var(--colors-text-main)",
          fontSize: Math.max(10, size * 0.55),
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          userSelect: "none",
          ...style,
        }}
      >
        {text}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      title={title}
      width={size}
      height={size}
      onError={() => setErrored(true)}
      style={{
        borderRadius: "50%",
        objectFit: "cover",
        display: "block",
        ...style,
      }}
    />
  );
}

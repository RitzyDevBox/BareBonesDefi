import React, { useState, useEffect, useRef } from "react";
import { useAppTheme } from "../../themes/AppThemeProvider";

interface AppBackgroundProps {
  children: React.ReactNode;
}

export function AppBackground({ children }: AppBackgroundProps) {
  const theme = useAppTheme();
  const bg = theme.appBackground;
  const opacity = bg.imageOpacity ?? 0.3;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  // Get honeycomb enabled state from localStorage
  const [honeycombEnabled, setHoneycombEnabled] = useState(() => {
    const saved = localStorage.getItem("honeycombEnabled");
    return saved !== null ? saved === "true" : true;
  });

  // Save preference to localStorage
  const toggleHoneycomb = () => {
    const newValue = !honeycombEnabled;
    setHoneycombEnabled(newValue);
    localStorage.setItem("honeycombEnabled", String(newValue));
  };

  useEffect(() => {
    if (!honeycombEnabled || !canvasRef.current || !bg.honeycomb) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    const hexagons: Array<{
      x: number;
      y: number;
      size: number;
      opacity: number;
      phase: number;
      speed: number;
    }> = [];
    const seed = Math.random() * 10000;

    // Get config from theme
    const config = bg.honeycomb;
    const hexSize = config.hexSize ?? 40;
    const baseOpacity = config.opacity ?? 0.1;
    const animSpeed = config.animationSpeed ?? 1;
    const bgColor = config.backgroundColor ?? bg.color ?? "#1a1410";
    const hueBase = config.hue ?? 35;
    const saturation = config.saturation ?? 70;
    const lightness = config.lightness ?? 60;

    function seededRandom(x: number, y: number, s: number) {
      const n = Math.sin(x * 12.9898 + y * 78.233 + s) * 43758.5453;
      return n - Math.floor(n);
    }

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      initHexagons();
    }

    function initHexagons() {
      hexagons.length = 0;
      const size = Math.min(w, h) < 600 ? hexSize * 0.75 : hexSize;
      const xCount = Math.ceil(w / (size * 1.5)) + 2;
      const yCount = Math.ceil(h / (size * Math.sqrt(3))) + 2;

      for (let row = -1; row < yCount; row++) {
        for (let col = -1; col < xCount; col++) {
          const x = col * size * 1.5;
          const y = row * size * Math.sqrt(3) + (col % 2) * size * Math.sqrt(3) / 2;

          const rand = seededRandom(col, row, seed);
          const opacity = baseOpacity + rand * baseOpacity * 1.5;
          const phase = rand * Math.PI * 2;
          const speed = (0.0005 + rand * 0.001) * animSpeed;

          hexagons.push({ x, y, size, opacity, phase, speed });
        }
      }
    }

    function drawHexagon(x: number, y: number, size: number, opacity: number, pulse: number) {
      if (!ctx) return;
      
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = x + (size + pulse * 3) * Math.cos(angle);
        const py = y + (size + pulse * 3) * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const hue = hueBase + Math.sin(x * 0.01 + y * 0.01) * 10;
      ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity * (0.8 + pulse * 0.4)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = `hsla(${hue}, ${saturation - 10}%, ${lightness - 10}%, ${opacity * 0.1 * (0.5 + pulse * 0.5)})`;
      ctx.fill();
    }

    function animate() {
      if (!ctx) return;
      
      ctx.fillStyle = bgColor.includes("rgb") 
        ? bgColor.replace(")", ", 0.05)").replace("rgb", "rgba")
        : `${bgColor}0d`; // hex + opacity
      ctx.fillRect(0, 0, w, h);

      const time = Date.now();

      hexagons.forEach(hex => {
        const pulse = Math.sin(time * hex.speed + hex.phase) * 0.5 + 0.5;
        drawHexagon(hex.x, hex.y, hex.size, hex.opacity, pulse);
      });

      animationRef.current = requestAnimationFrame(animate);
    }

    window.addEventListener("resize", resize);
    resize();

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [honeycombEnabled, bg.honeycomb, bg.color]);

  return (
    <>
      {/* BACKGROUND LAYER */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: bg.color || "#1a1410",
          overflow: "hidden",
          zIndex: -1,
        }}
      >
        {/* Honeycomb Canvas (when enabled) */}
        {honeycombEnabled && bg.honeycomb && (
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            }}
          />
        )}

        {/* Fallback to background image (when animation disabled) */}
        {!honeycombEnabled && bg.fullImage && (
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
      </div>

      {/* Toggle Button */}
      {/* {bg.honeycomb && (
        <button
          onClick={toggleHoneycomb}
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 1000,
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            color: "white",
            cursor: "pointer",
            fontSize: "14px",
            backdropFilter: "blur(10px)",
          }}
          aria-label={honeycombEnabled ? "Disable honeycomb animation" : "Enable honeycomb animation"}
        >
          {honeycombEnabled ? "🐝 Disable Animation" : "🐝 Enable Animation"}
        </button>
      )} */}

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
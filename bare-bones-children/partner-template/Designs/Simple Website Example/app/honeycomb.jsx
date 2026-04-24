// Honeycomb animated background — reads theme colors from CSS vars

function Honeycomb({ enabled }) {
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(0);

  React.useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    const seed = Math.random() * 10000;
    const hexagons = [];

    // Read theme-aware colors from CSS vars
    const getThemeColors = () => {
      const cs = getComputedStyle(document.documentElement);
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      return {
        bg: (cs.getPropertyValue('--bg') || '#0c0c0d').trim(),
        line: (cs.getPropertyValue('--line') || '#24242a').trim(),
        accent: (cs.getPropertyValue('--accent') || 'oklch(0.78 0.14 148)').trim(),
        isLight,
      };
    };
    let colors = getThemeColors();

    const seededRandom = (x, y, s) => {
      const n = Math.sin(x * 12.9898 + y * 78.233 + s) * 43758.5453;
      return n - Math.floor(n);
    };

    const initHexagons = () => {
      hexagons.length = 0;
      const size = Math.min(w, h) < 640 ? 22 : 32;
      const xCount = Math.ceil(w / (size * 1.5)) + 2;
      const yCount = Math.ceil(h / (size * Math.sqrt(3))) + 2;
      for (let row = -1; row < yCount; row++) {
        for (let col = -1; col < xCount; col++) {
          const x = col * size * 1.5;
          const y = row * size * Math.sqrt(3) + (col % 2) * size * Math.sqrt(3) / 2;
          const rand = seededRandom(col, row, seed);
          const rand2 = seededRandom(col + 37, row + 91, seed);
          const opacity = 0.20 + rand * 0.35;
          const phase = rand * Math.PI * 2;
          const speed = (0.00012 + rand * 0.00022);
          // ~18% of cells glow in accent, with varied intensity
          const accent = rand2 > 0.82;
          const accentStrength = accent ? (0.5 + rand2 * 0.8) : 0;
          hexagons.push({ x, y, size, opacity, phase, speed, accent, accentStrength });
        }
      }
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initHexagons();
    };

    const drawHex = (x, y, size, strokeStyle, fillStyle) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (fillStyle) { ctx.fillStyle = fillStyle; ctx.fill(); }
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      const t = Date.now();
      // A slow-moving cursor of brightness sweeps across so the whole grid shimmers
      const sweepX = (Math.sin(t * 0.00006) * 0.5 + 0.5) * w;
      const sweepY = (Math.cos(t * 0.000045) * 0.5 + 0.5) * h;
      const sweepR = Math.max(w, h) * 0.45;

      for (let i = 0; i < hexagons.length; i++) {
        const hex = hexagons[i];
        const pulse = Math.sin(t * hex.speed + hex.phase) * 0.5 + 0.5;
        // distance-based highlight
        const dx = hex.x - sweepX, dy = hex.y - sweepY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const sweep = Math.max(0, 1 - dist / sweepR);
        const mix = pulse * 0.25 + sweep * 0.9;
        const baseAlpha = Math.min(1, hex.opacity * (0.4 + mix * 1.4));

        if (hex.accent) {
          const accentAlpha = Math.min(1, baseAlpha * (0.9 + hex.accentStrength) + sweep * 0.3);
          drawHex(hex.x, hex.y, hex.size,
            `color-mix(in oklab, ${colors.accent} ${Math.round(accentAlpha * 100)}%, transparent)`,
            `color-mix(in oklab, ${colors.accent} ${Math.round(accentAlpha * 28)}%, transparent)`);
        } else {
          drawHex(hex.x, hex.y, hex.size,
            `color-mix(in oklab, ${colors.line} ${Math.round(baseAlpha * 260)}%, transparent)`,
            sweep > 0.3
              ? `color-mix(in oklab, ${colors.accent} ${Math.round(sweep * 6)}%, transparent)`
              : null);
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    // Refresh colors whenever theme/tweaks change
    const obs = new MutationObserver(() => { colors = getThemeColors(); });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
      obs.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div aria-hidden style={{
      position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden',
      background: 'var(--bg)', pointerEvents: 'none',
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, opacity: 1 }} />
      {/* soft radial vignette + top gradient for depth */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 60%)',
        mixBlendMode: 'screen',
        opacity: 0.5,
      }} />
    </div>
  );
}

window.Honeycomb = Honeycomb;

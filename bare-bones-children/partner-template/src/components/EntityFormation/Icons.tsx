// Inline SVG icons used throughout the entity-formation wizard. Replaces
// Unicode glyphs (←, →, ‹, ›, ↓) that never sat correctly against button
// text — their baseline ascenders/descenders drift by font, and they don't
// vertically center inside flex buttons. SVGs with `viewBox 0 0 24 24` +
// `stroke="currentColor"` + `display: block` produce a consistently-sized
// glyph that flex-aligns naturally to the surrounding text.
//
// All icons:
//   - inherit color from the parent button (`currentColor`)
//   - take `size` (px) and `stroke` (px) props with sensible defaults
//   - are marked `aria-hidden` since the surrounding button text already
//     conveys meaning (and the step-nav arrows have explicit aria-labels)

interface IconProps {
  size?: number
  stroke?: number
}

function Svg({
  size = 16,
  stroke = 2,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      // display: block kills the inline baseline gap that makes SVGs sit
      // ~3px below text in a flex row.
      style={{ display: "block" }}
    >
      {children}
    </svg>
  )
}

export function ChevronLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="15 6 9 12 15 18" />
    </Svg>
  )
}

export function ChevronRight(props: IconProps) {
  return (
    <Svg {...props}>
      <polyline points="9 6 15 12 9 18" />
    </Svg>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v12" />
      <polyline points="6 11 12 17 18 11" />
      <line x1="4" y1="20" x2="20" y2="20" />
    </Svg>
  )
}

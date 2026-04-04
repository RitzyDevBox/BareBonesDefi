export function SaveIcon({
  size = 20,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 4H16L20 8V19C20 20.1 19.1 21 18 21H6C4.9 21 4 20.1 4 19V5C4 4.45 4.45 4 5 4Z" />
      <path d="M8 4V10H15V4" />
      <path d="M8 16H16" />
    </svg>
  );
}

export function TrashBinIcon({
  size = 18,
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
      <path d="M4 7H20" />
      <path d="M9 4H15" />
      <path d="M7 7L8 19C8.05 19.6 8.55 20 9.15 20H14.85C15.45 20 15.95 19.6 16 19L17 7" />
      <path d="M10 10V16" />
      <path d="M14 10V16" />
    </svg>
  );
}

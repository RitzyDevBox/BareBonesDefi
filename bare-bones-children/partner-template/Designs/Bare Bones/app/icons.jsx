// Minimal inline icons — no emoji, no 3rd-party deps.
const Icon = ({ d, size = 16, stroke = 1.6, fill = 'none' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke="currentColor"
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const I = {
  Caret:     (p) => <Icon {...p} d="M6 9l6 6 6-6" />,
  Gear:      (p) => <Icon {...p} d={["M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z","M19.4 13.5a7.5 7.5 0 0 0 0-3l2-1.5-2-3.4-2.4.9a7.5 7.5 0 0 0-2.6-1.5L14 2h-4l-.4 2.5a7.5 7.5 0 0 0-2.6 1.5l-2.4-.9-2 3.4 2 1.5a7.5 7.5 0 0 0 0 3l-2 1.5 2 3.4 2.4-.9a7.5 7.5 0 0 0 2.6 1.5L10 22h4l.4-2.5a7.5 7.5 0 0 0 2.6-1.5l2.4.9 2-3.4-2-1.5Z"]} />,
  Close:     (p) => <Icon {...p} d={["M6 6l12 12","M18 6L6 18"]} />,
  Copy:      (p) => <Icon {...p} d={["M9 9h10v10H9z","M5 15V5h10"]} />,
  Check:     (p) => <Icon {...p} d="M5 12l5 5 9-11" />,
  Ext:       (p) => <Icon {...p} d={["M14 4h6v6","M20 4l-9 9","M20 14v6H4V4h6"]} />,
  Sun:       (p) => <Icon {...p} d={["M12 4V2","M12 22v-2","M4 12H2","M22 12h-2","M5.6 5.6 4.2 4.2","M19.8 19.8l-1.4-1.4","M5.6 18.4l-1.4 1.4","M19.8 4.2l-1.4 1.4","M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"]} />,
  Moon:      (p) => <Icon {...p} d="M21 14.5A8.5 8.5 0 1 1 9.5 3a6.5 6.5 0 0 0 11.5 11.5Z" />,
  System:    (p) => <Icon {...p} d={["M3 5h18v11H3z","M8 20h8","M12 16v4"]} />,
  Menu:      (p) => <Icon {...p} d={["M4 7h16","M4 12h16","M4 17h16"]} />,
  Disconnect:(p) => <Icon {...p} d={["M9 12h12","M17 8l4 4-4 4","M13 4H5v16h8"]} />,
  Plus:      (p) => <Icon {...p} d={["M12 5v14","M5 12h14"]} />,
  Warn:      (p) => <Icon {...p} d={["M12 3 2 20h20L12 3Z","M12 10v5","M12 17.5v.5"]} />,
  Info:      (p) => <Icon {...p} d={["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z","M12 10v7","M12 7.5v.5"]} />,
  ErrorI:    (p) => <Icon {...p} d={["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z","M8 8l8 8","M16 8l-8 8"]} />,
  CheckC:    (p) => <Icon {...p} d={["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z","M8 12l3 3 5-6"]} />,
  Arrow:     (p) => <Icon {...p} d={["M5 12h14","M13 5l7 7-7 7"]} />,
  Clock:     (p) => <Icon {...p} d={["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z","M12 7v5l3 2"]} />,
  Sparkle:   (p) => <Icon {...p} d={["M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z","M19 16l.7 1.8L21.5 18l-1.8.7L19 20l-.7-1.3L16.5 18l1.8-.2L19 16Z"]} />,
  Layers:    (p) => <Icon {...p} d={["M12 3l9 5-9 5-9-5 9-5Z","M3 13l9 5 9-5","M3 17l9 5 9-5"]} />,
  Book:      (p) => <Icon {...p} d={["M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4Z","M4 17a3 3 0 0 1 3-3h12"]} />,
  Search:    (p) => <Icon {...p} d={["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z","M16 16l5 5"]} />,
  Code:      (p) => <Icon {...p} d={["M8 7l-5 5 5 5","M16 7l5 5-5 5","M14 4l-4 16"]} />,
  Memo:      (p) => <Icon {...p} d={["M5 3h11l4 4v14H5z","M16 3v4h4","M9 12h7","M9 16h7","M9 8h3"]} />,
  Wallet:    (p) => <Icon {...p} d={["M3 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1V7Z","M3 7V5a2 2 0 0 1 2-2h12","M16 13h3"]} />,
  Trash:     (p) => <Icon {...p} d={["M4 7h16","M9 7V4h6v3","M6 7l1 13h10l1-13","M10 11v6","M14 11v6"]} />,
  Pencil:    (p) => <Icon {...p} d={["M4 20h4l11-11-4-4L4 16v4Z","M13 6l4 4"]} />,
  Eye:       (p) => <Icon {...p} d={["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"]} />,
  Bolt:      (p) => <Icon {...p} d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  Alert:     (p) => <Icon {...p} d={["M12 3 2 20h20L12 3Z","M12 10v5","M12 17.5v.5"]} />,
  Receipt:   (p) => <Icon {...p} d={["M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3Z","M8 8h8","M8 12h8","M8 16h5"]} />,
  Undo:      (p) => <Icon {...p} d={["M9 14H4V9","M4 14a8 8 0 1 1 2 5"]} />,
  X:         (p) => <Icon {...p} d={["M6 6l12 12","M18 6L6 18"]} />,
  Money:     (p) => <Icon {...p} d={["M3 6h18v12H3z","M3 10h18","M7 14h3"]} />,
  Play:      (p) => <Icon {...p} d="M7 4l13 8-13 8V4Z" />,
};

window.I = I;
window.Icon = Icon;

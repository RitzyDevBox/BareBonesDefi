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
};

window.I = I;
window.Icon = Icon;

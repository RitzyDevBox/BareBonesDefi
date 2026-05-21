import { useEffect, useRef, useState } from "react";
import { DialCode, EF_DIAL_CODES } from "./types";

export interface PhoneValue {
  phoneDial: string;
  phoneIso: string;
  phoneNum: string;
}

interface PhoneInputProps {
  value: PhoneValue;
  onChange: (v: PhoneValue) => void;
  placeholder?: string;
}

export function PhoneInput({ value, onChange, placeholder }: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current: DialCode =
    EF_DIAL_CODES.find((d) => d.iso === value.phoneIso) ?? EF_DIAL_CODES[0];

  return (
    <div className="ef-phone" ref={ref}>
      <div className="ef-phone-dial-wrap">
        <button
          type="button"
          className="ef-phone-dial"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="ef-phone-dial-flag">{current.flag}</span>
          <span className="ef-phone-dial-code">{current.code}</span>
          <svg
            className="ef-phone-dial-caret"
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 4.5 6 7.5 9 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {open && (
          <div className="ef-phone-dial-pop" role="listbox">
            {EF_DIAL_CODES.map((d) => (
              <button
                key={d.iso}
                type="button"
                role="option"
                aria-selected={d.iso === current.iso}
                className={`ef-phone-dial-item ${d.iso === current.iso ? "on" : ""}`}
                onClick={() => {
                  onChange({ ...value, phoneDial: d.code, phoneIso: d.iso });
                  setOpen(false);
                }}
              >
                <span style={{ fontSize: 15, lineHeight: 1 }}>{d.flag}</span>
                <span className="ef-phone-dial-item-name">{d.name}</span>
                <span className="ef-phone-dial-item-code">{d.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        className="ef-phone-num"
        inputMode="tel"
        placeholder={placeholder ?? "555 123 4567"}
        value={value.phoneNum}
        onChange={(e) => onChange({ ...value, phoneNum: e.target.value })}
      />
    </div>
  );
}

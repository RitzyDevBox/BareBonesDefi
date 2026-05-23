export interface PhoneValue {
  phoneDial: string;
  phoneIso: string;
  /** Just the national digits, no formatting. e.g. "5551234567" */
  phoneNum: string;
}

interface PhoneInputProps {
  value: PhoneValue;
  onChange: (v: PhoneValue) => void;
  placeholder?: string;
}

const US_DIAL = "+1";
const US_ISO = "US";
const NANP_MAX_DIGITS = 10;

// US-only for v1. Wyoming DAO LLC filers are predominantly US-based — even
// foreign filers usually list a US contact line. International callers
// (separate dial-code dropdown, per-country digit caps) would be a meaningful
// chunk of complexity; defer until a real user needs it.
//
// Display: (555) 123-4567 as the user types.
// Input:   stripped to digits, capped at NANP_MAX_DIGITS.
// Storage: phoneNum holds just the 10 digits; the +1 prefix is added at
//          submit-time by the wizard's phoneToE164 helper.
function formatNanp(digits: string): string {
  const d = digits.slice(0, NANP_MAX_DIGITS);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function PhoneInput({ value, onChange, placeholder }: PhoneInputProps) {
  const display = formatNanp(value.phoneNum);
  return (
    <div className="ef-phone">
      <div className="ef-phone-dial" aria-hidden="true" style={{ cursor: "default" }}>
        <span className="ef-phone-dial-flag">🇺🇸</span>
        <span className="ef-phone-dial-code">{US_DIAL}</span>
      </div>
      <input
        className="ef-phone-num"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={placeholder ?? "(555) 123-4567"}
        value={display}
        onChange={(e) => {
          // Strip everything that isn't a digit; cap at 10. Anything the
          // user types gets normalized before we store it.
          const digits = e.target.value.replace(/\D+/g, "").slice(0, NANP_MAX_DIGITS);
          onChange({
            phoneDial: US_DIAL,
            phoneIso: US_ISO,
            phoneNum: digits,
          });
        }}
      />
    </div>
  );
}

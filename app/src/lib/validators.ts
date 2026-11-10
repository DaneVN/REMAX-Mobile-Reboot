// Shared validation helpers -- used by both NewDeal and EditDeal so the
// rules stay in one place instead of drifting between forms.

export function isValidPhone(value: string): boolean {
  return /^\d{10}$/.test(value);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// ---------------------------------------------------------------------------
// Numeric field validators. Each returns an error message, or null when the
// value is fine. A blank value is "not provided" and passes unless the caller
// passes { required: true } -- optional fields stay optional.
// ---------------------------------------------------------------------------

type NumberRule = { required?: boolean };

function parseField(
  raw: string,
  label: string,
  { required }: NumberRule,
): { error: string } | { value: number } | { blank: true } {
  const trimmed = raw.trim();
  if (trimmed === "")
    return required ? { error: `${label} is required.` } : { blank: true };
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return { error: `${label} must be a number.` };
  return { value };
}

// Money: zero or more, with a sane upper ceiling so a typo can't store 1e15.
export const MAX_AMOUNT = 1_000_000_000_000;

export function validateAmount(
  raw: string,
  label: string,
  rule: NumberRule = {},
): string | null {
  const r = parseField(raw, label, rule);
  if ("error" in r) return r.error;
  if ("blank" in r) return null;
  if (r.value < 0) return `${label} can't be negative.`;
  if (r.value > MAX_AMOUNT) return `${label} is too large.`;
  return null;
}

// Percentage between 0 and 100 inclusive.
export function validatePercent(
  raw: string,
  label: string,
  rule: NumberRule = {},
): string | null {
  const r = parseField(raw, label, rule);
  if ("error" in r) return r.error;
  if ("blank" in r) return null;
  if (r.value < 0 || r.value > 100)
    return `${label} must be between 0 and 100.`;
  return null;
}

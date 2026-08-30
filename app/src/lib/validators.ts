// Shared validation helpers -- used by both NewDeal and EditDeal so the
// rules stay in one place instead of drifting between forms.

export function isValidPhone(value: string): boolean {
  return /^\d{10}$/.test(value);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

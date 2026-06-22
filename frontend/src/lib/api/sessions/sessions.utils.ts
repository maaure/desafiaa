/** Format a pin number for display — always 4 digits with leading zeros. */
export function formatPin(pin: string | null | undefined): string {
  if (!pin) return "----";
  return pin.padStart(4, "0");
}

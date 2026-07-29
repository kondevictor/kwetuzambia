export function formatZmw(amountMinor: number): string {
  return `ZMW ${(amountMinor / 100).toLocaleString("en-ZM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Shared helper: WhatsApp template params are positional, so every handler
 * needs to project its named values into the exact order the template
 * registry defines. Centralized here so all five handlers stay consistent.
 */
export function pickOrdered(
  values: Record<string, string | number>,
  order: string[]
): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  for (const key of order) result[key] = values[key];
  return result;
}

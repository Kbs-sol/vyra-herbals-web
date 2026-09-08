/**
 * Shared helper: WhatsApp template params are positional, so every handler
 * needs to project its named values into the exact order the template
 * registry defines. Centralized here so all five handlers stay consistent.
 */
export function pickOrdered(
  values: Record<string, string | number>,
  order: string[]
): (string | number)[] {
  const result: (string | number)[] = [];
  for (const key of order) {
    // We push empty string instead of undefined to satisfy Meta API which requires all params
    result.push(values[key] ?? '');
  }
  return result;
}

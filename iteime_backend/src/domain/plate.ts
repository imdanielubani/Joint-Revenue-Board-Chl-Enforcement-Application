/**
 * Plate numbers are matched with spaces and hyphens ignored and letters in
 * upper case (SRD §11): "ABC 123 AA", "ABC-123-AA" and "abc123aa" are the
 * same plate.
 */

/** The search value for [input]: no spaces or hyphens, upper case. */
export function normalizePlate(input: string): string {
  return input.replace(/[\s-]+/g, '').toUpperCase();
}

/**
 * A plate is 3 to 10 letters and digits once normalised.
 */
// TODO(api): confirm the official plate rules with JRB / CHL.
const platePattern = /^[A-Z0-9]{3,10}$/;

/** The normalised plate, or null when [input] can't be a plate. */
export function parsePlate(input: string): string | null {
  const plate = normalizePlate(input);
  return platePattern.test(plate) ? plate : null;
}

/** "Daniel Ubani" → "DU"; "Adaeze" → "AD"; first and last names, upper case. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0] ?? ''
  if (words.length === 1) return first.slice(0, 2).toUpperCase()
  const last = words[words.length - 1] ?? ''
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

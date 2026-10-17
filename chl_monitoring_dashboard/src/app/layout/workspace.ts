import type { User } from '@/features/auth/auth.schemas'

/** The sidebar's workspace card: "National workspace" / "Joint Revenue Board", from the user's areas. */
export function workspaceOf(user: User): { name: string; organization: string } {
  const [first, ...others] = user.scopes
  let name = 'No areas assigned'
  if (first?.level === 'national') name = 'National workspace'
  else if (first && others.length === 0) name = `${first.name} workspace`
  else if (first) name = `${user.scopes.length} areas`
  return { name, organization: user.organization ?? 'Joint Revenue Board' }
}

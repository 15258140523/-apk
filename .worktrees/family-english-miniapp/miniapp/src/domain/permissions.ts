import type { Role } from './model'

export type Capability =
  | 'family.read'
  | 'course.write'
  | 'lesson.complete'
  | 'learning.write'
  | 'member.inviteViewer'
  | 'member.assignAdmin'
  | 'family.delete'

const grants: Record<Role, ReadonlySet<Capability>> = {
  owner: new Set([
    'family.read',
    'course.write',
    'lesson.complete',
    'learning.write',
    'member.inviteViewer',
    'member.assignAdmin',
    'family.delete',
  ]),
  admin: new Set([
    'family.read',
    'course.write',
    'lesson.complete',
    'learning.write',
    'member.inviteViewer',
  ]),
  viewer: new Set(['family.read']),
}

export function can(role: Role, capability: Capability): boolean {
  return grants[role].has(capability)
}

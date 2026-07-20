import type { Family, FamilyMember, Role } from '../domain/model'
import { cloudObject } from './cloud'

interface RawFamily {
  _id: string
  family_id: string
  child_name: string
  owner_user_id: string
  status: 'active' | 'deleting'
  delete_after?: number | null
}

interface RawMember {
  _id: string
  family_id: string
  display_name: string
  role: Role
  active: boolean
}

interface RawFamilySession {
  family: RawFamily
  member: RawMember
}

interface FamilyCloudObject {
  createFamily(input: { childName: string; requestId: string }): Promise<RawFamilySession>
  getCurrentFamily(): Promise<RawFamilySession | null>
  createInvite(input: { familyId: string }): Promise<{ token: string; expiresAt: number }>
  acceptInvite(input: { token: string }): Promise<RawFamilySession>
  listMembers(input: { familyId: string }): Promise<{ members: RawMember[] }>
  changeRole(input: {
    familyId: string
    memberId: string
    role: Exclude<Role, 'owner'>
  }): Promise<{ member: RawMember }>
  removeMember(input: { familyId: string; memberId: string }): Promise<{ removed: true }>
  requestDelete(input: { familyId: string; childName: string }): Promise<{ deleteAfter: number }>
  restoreFamily(input: { familyId: string }): Promise<{ restored: true }>
}

export interface FamilySession {
  family: Family
  member: FamilyMember
}

function api(): FamilyCloudObject {
  return cloudObject<FamilyCloudObject>('family')
}

function mapFamily(value: RawFamily): Family {
  return {
    id: value._id,
    familyId: value.family_id,
    childName: value.child_name,
    ownerUserId: value.owner_user_id,
    status: value.status,
    deleteAfter: value.delete_after,
  }
}

function mapMember(value: RawMember): FamilyMember {
  return {
    id: value._id,
    familyId: value.family_id,
    displayName: value.display_name,
    role: value.role,
    active: value.active,
  }
}

function mapSession(value: RawFamilySession): FamilySession {
  return { family: mapFamily(value.family), member: mapMember(value.member) }
}

export async function getCurrentFamily(): Promise<FamilySession | null> {
  const result = await api().getCurrentFamily()
  return result ? mapSession(result) : null
}

export async function createFamily(childName: string, requestId: string): Promise<FamilySession> {
  return mapSession(await api().createFamily({ childName, requestId }))
}

export async function createInvite(familyId: string) {
  return api().createInvite({ familyId })
}

export async function acceptInvite(token: string): Promise<FamilySession> {
  return mapSession(await api().acceptInvite({ token }))
}

export async function listMembers(familyId: string): Promise<FamilyMember[]> {
  const result = await api().listMembers({ familyId })
  return result.members.map(mapMember)
}

export async function changeRole(
  familyId: string,
  memberId: string,
  role: Exclude<Role, 'owner'>,
): Promise<FamilyMember> {
  const result = await api().changeRole({ familyId, memberId, role })
  return mapMember(result.member)
}

export async function removeMember(familyId: string, memberId: string) {
  return api().removeMember({ familyId, memberId })
}

export async function requestDelete(familyId: string, childName: string) {
  return api().requestDelete({ familyId, childName })
}

export async function restoreFamily(familyId: string) {
  return api().restoreFamily({ familyId })
}

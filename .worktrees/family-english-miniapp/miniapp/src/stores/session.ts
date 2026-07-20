import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Family, FamilyMember, Role } from '../domain/model'
import { publicMessage } from '../services/cloud'
import {
  acceptInvite as acceptFamilyInvite,
  changeRole as changeMemberRole,
  createFamily as createFamilyRequest,
  getCurrentFamily,
  listMembers as listFamilyMembers,
  removeMember as removeFamilyMember,
  requestDelete as requestFamilyDelete,
  type FamilySession,
} from '../services/family'

type SessionLoader = () => Promise<FamilySession | null>

export const useSessionStore = defineStore('session', () => {
  const family = ref<Family | null>(null)
  const currentMember = ref<FamilyMember | null>(null)
  const members = ref<FamilyMember[]>([])
  const loading = ref(true)
  const error = ref('')

  function applySession(value: FamilySession | null) {
    family.value = value?.family ?? null
    currentMember.value = value?.member ?? null
  }

  async function bootstrap(loader: SessionLoader = getCurrentFamily) {
    loading.value = true
    error.value = ''
    try {
      applySession(await loader())
    } catch (cause) {
      applySession(null)
      error.value = publicMessage(cause)
    } finally {
      loading.value = false
    }
  }

  async function createFamily(childName: string, requestId: string) {
    loading.value = true
    error.value = ''
    try {
      applySession(await createFamilyRequest(childName, requestId))
    } catch (cause) {
      error.value = publicMessage(cause)
      throw cause
    } finally {
      loading.value = false
    }
  }

  async function acceptInvite(token: string) {
    loading.value = true
    error.value = ''
    try {
      applySession(await acceptFamilyInvite(token))
    } catch (cause) {
      error.value = publicMessage(cause)
      throw cause
    } finally {
      loading.value = false
    }
  }

  async function loadMembers() {
    if (!family.value) return
    members.value = await listFamilyMembers(family.value.familyId)
  }

  async function changeRole(memberId: string, role: Exclude<Role, 'owner'>) {
    if (!family.value) return
    const updated = await changeMemberRole(family.value.familyId, memberId, role)
    members.value = members.value.map((member) =>
      member.id === memberId ? updated : member,
    )
  }

  async function removeMember(memberId: string) {
    if (!family.value) return
    await removeFamilyMember(family.value.familyId, memberId)
    members.value = members.value.filter((member) => member.id !== memberId)
  }

  async function requestDelete() {
    if (!family.value) return
    await requestFamilyDelete(family.value.familyId, family.value.childName)
    family.value = { ...family.value, status: 'deleting' }
  }

  return {
    family,
    currentMember,
    members,
    loading,
    error,
    bootstrap,
    createFamily,
    acceptInvite,
    loadMembers,
    changeRole,
    removeMember,
    requestDelete,
  }
})

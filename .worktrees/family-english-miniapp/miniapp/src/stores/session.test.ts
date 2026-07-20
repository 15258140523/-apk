import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSessionStore } from './session'

describe('session store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('bootstraps the current family and member', async () => {
    const store = useSessionStore()
    await store.bootstrap(async () => ({
      family: {
        id: 'f1',
        familyId: 'f1',
        childName: '果果',
        ownerUserId: 'u1',
        status: 'active',
      },
      member: {
        id: 'm1',
        familyId: 'f1',
        displayName: '妈妈',
        role: 'owner',
        active: true,
      },
    }))

    expect(store.family?.childName).toBe('果果')
    expect(store.currentMember?.role).toBe('owner')
    expect(store.loading).toBe(false)
  })

  it('keeps a public error when bootstrap fails', async () => {
    const store = useSessionStore()
    await store.bootstrap(async () => {
      throw new Error('网络不可用')
    })

    expect(store.family).toBeNull()
    expect(store.error).toBe('网络不可用')
    expect(store.loading).toBe(false)
  })
})

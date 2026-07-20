import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { LearningRecord } from '../services/learning'
import { publicMessage } from '../services/cloud'
import { listRecords } from '../services/learning'
import { useSessionStore } from './session'

export const useLearningStore = defineStore('learning', () => {
  const records = ref<LearningRecord[]>([])
  const nextCursor = ref<string | null>(null)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref('')
  const filterCourseId = ref('')

  async function load() {
    const session = useSessionStore()
    if (!session.family) return
    loading.value = true
    error.value = ''
    try {
      const result = await listRecords(
        session.family.familyId,
        filterCourseId.value || undefined,
      )
      records.value = result.records
      nextCursor.value = result.nextCursor
    } catch (cause) {
      error.value = publicMessage(cause)
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    const session = useSessionStore()
    if (!session.family || !nextCursor.value || loadingMore.value) return
    loadingMore.value = true
    try {
      const result = await listRecords(
        session.family.familyId,
        filterCourseId.value || undefined,
        nextCursor.value,
      )
      records.value = [...records.value, ...result.records]
      nextCursor.value = result.nextCursor
    } catch (cause) {
      error.value = publicMessage(cause)
    } finally {
      loadingMore.value = false
    }
  }

  function setFilter(courseId: string) {
    filterCourseId.value = courseId
  }

  return {
    records,
    nextCursor,
    loading,
    loadingMore,
    error,
    filterCourseId,
    load,
    loadMore,
    setFilter,
  }
})

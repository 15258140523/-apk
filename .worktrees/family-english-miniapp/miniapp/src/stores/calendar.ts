import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Lesson } from '../domain/model'
import { publicMessage } from '../services/cloud'
import { listLessons } from '../services/lessons'
import { useSessionStore } from './session'

function mondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + days)
  return result
}

export interface DayGroup {
  date: string
  label: string
  lessons: Lesson[]
}

export const useCalendarStore = defineStore('calendar', () => {
  const lessons = ref<Lesson[]>([])
  const loading = ref(false)
  const error = ref('')
  const weekStart = ref(formatDate(mondayOf(new Date())))

  const weekEnd = computed(() => {
    const start = new Date(weekStart.value + 'T12:00:00+08:00')
    return formatDate(addDays(start, 6))
  })

  const weekLabel = computed(() => {
    const start = new Date(weekStart.value + 'T12:00:00+08:00')
    const end = new Date(weekEnd.value + 'T12:00:00+08:00')
    const fmt = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' })
    return `${fmt.format(start)} – ${fmt.format(end)}`
  })

  const dayGroups = computed<DayGroup[]>(() => {
    const start = new Date(weekStart.value + 'T12:00:00+08:00')
    const groups: DayGroup[] = []
    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i)
      const dateStr = formatDate(d)
      groups.push({
        date: dateStr,
        label: `${weekdayNames[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`,
        lessons: lessons.value.filter(
          (l) => l.actualAt.startsWith(dateStr) || l.plannedAt.startsWith(dateStr),
        ),
      })
    }
    return groups
  })

  async function loadWeek(loader?: (familyId: string, from: string, to: string) => Promise<Lesson[]>) {
    const session = useSessionStore()
    if (!session.family) return
    loading.value = true
    error.value = ''
    try {
      const fn = loader ?? listLessons
      lessons.value = await fn(session.family.familyId, weekStart.value, weekEnd.value)
    } catch (cause) {
      error.value = publicMessage(cause)
    } finally {
      loading.value = false
    }
  }

  function goPrevWeek() {
    const d = new Date(weekStart.value + 'T12:00:00+08:00')
    weekStart.value = formatDate(addDays(d, -7))
  }

  function goNextWeek() {
    const d = new Date(weekStart.value + 'T12:00:00+08:00')
    weekStart.value = formatDate(addDays(d, 7))
  }

  function goThisWeek() {
    weekStart.value = formatDate(mondayOf(new Date()))
  }

  return {
    lessons,
    loading,
    error,
    weekStart,
    weekEnd,
    weekLabel,
    dayGroups,
    loadWeek,
    goPrevWeek,
    goNextWeek,
    goThisWeek,
  }
})

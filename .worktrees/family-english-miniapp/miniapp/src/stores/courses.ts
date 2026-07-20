import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Course } from '../domain/model'
import { publicMessage } from '../services/cloud'
import { listCourses } from '../services/courses'
import { useSessionStore } from './session'

type CourseLoader = () => Promise<Course[]>

export const useCoursesStore = defineStore('courses', () => {
  const courses = ref<Course[]>([])
  const loading = ref(false)
  const error = ref('')

  const nextCourse = computed(() => {
    return [...courses.value]
      .filter((course) => course.nextLesson)
      .sort(
        (left, right) =>
          Date.parse(left.nextLesson!.actualAt) - Date.parse(right.nextLesson!.actualAt),
      )[0] ?? null
  })

  const otherCourses = computed(() =>
    courses.value.filter((course) => course.id !== nextCourse.value?.id),
  )

  async function load(loader?: CourseLoader) {
    const session = useSessionStore()
    const actualLoader = loader ?? (() => {
      if (!session.family) return Promise.resolve([])
      return listCourses(session.family.familyId)
    })
    loading.value = true
    error.value = ''
    try {
      courses.value = await actualLoader()
    } catch (cause) {
      error.value = publicMessage(cause)
    } finally {
      loading.value = false
    }
  }

  async function refreshAfterLessonChange() {
    await load()
  }

  return {
    courses,
    loading,
    error,
    nextCourse,
    otherCourses,
    load,
    refreshAfterLessonChange,
  }
})

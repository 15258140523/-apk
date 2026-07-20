import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCoursesStore } from './courses'

describe('courses store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('selects the course with the earliest pending lesson', async () => {
    const store = useCoursesStore()
    await store.load(async () => [
      {
        id: 'c1',
        familyId: 'f1',
        name: '自然拼读',
        remainingLessons: 10,
        version: 1,
        nextLesson: {
          id: 'l1',
          courseId: 'c1',
          plannedAt: '2026-07-18T10:00:00+08:00',
          actualAt: '2026-07-18T10:00:00+08:00',
          status: 'pending',
        },
      },
      {
        id: 'c2',
        familyId: 'f1',
        name: '外教口语',
        remainingLessons: 8,
        version: 1,
        nextLesson: {
          id: 'l2',
          courseId: 'c2',
          plannedAt: '2026-07-17T19:00:00+08:00',
          actualAt: '2026-07-17T19:00:00+08:00',
          status: 'pending',
        },
      },
    ])

    expect(store.nextCourse?.name).toBe('外教口语')
    expect(store.otherCourses.map((course) => course.name)).toEqual(['自然拼读'])
  })
})

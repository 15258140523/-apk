import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CourseHeroCard from './CourseHeroCard.vue'

describe('CourseHeroCard', () => {
  it('shows the next course and emits the completion action', async () => {
    const wrapper = mount(CourseHeroCard, {
      props: {
        course: {
          id: 'c1',
          familyId: 'f1',
          name: '外教口语',
          remainingLessons: 8,
          version: 1,
          nextLesson: {
            id: 'l1',
            courseId: 'c1',
            plannedAt: '2026-07-17T19:00:00+08:00',
            actualAt: '2026-07-17T19:00:00+08:00',
            status: 'pending',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('外教口语')
    expect(wrapper.text()).toContain('剩余 8 课时')
    await wrapper.get('[data-action="complete"]').trigger('click')
    expect(wrapper.emitted('complete')).toHaveLength(1)
  })
})

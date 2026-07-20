import type { LessonStatus } from './model'

const allowed: Record<LessonStatus, ReadonlySet<LessonStatus>> = {
  pending: new Set(['completed', 'leave', 'cancelled', 'rescheduled']),
  rescheduled: new Set(['completed', 'leave', 'cancelled']),
  completed: new Set(['pending']),
  leave: new Set(['pending', 'rescheduled']),
  cancelled: new Set(['pending', 'rescheduled']),
}

export function assertTransition(from: LessonStatus, to: LessonStatus): void {
  if (from === 'completed' && to === 'completed') {
    throw new Error('LESSON_ALREADY_COMPLETED')
  }
  if (!allowed[from].has(to)) {
    throw new Error('INVALID_LESSON_TRANSITION')
  }
}

import type { Lesson } from '../domain/model'
import { cloudObject } from './cloud'

interface RawLesson {
  _id: string
  course_id: string
  planned_at: string
  actual_at: string
  status: Lesson['status']
  occurrence_key: string
  version: number
}

interface RawCourse {
  _id: string
  family_id: string
  name: string
  remaining_lessons: number
  version: number
}

interface LessonCloudObject {
  listWindow(input: {
    familyId: string
    from: string
    to: string
  }): Promise<{ lessons: RawLesson[] }>

  detail(input: {
    familyId: string
    lessonId: string
  }): Promise<{
    lesson: RawLesson
    course: RawCourse | null
    reminderMembers: string[]
    learningRecord: unknown | null
  }>

  adjust(input: {
    familyId: string
    lessonId: string
    action: 'reschedule' | 'leave' | 'cancel'
    actualAt?: string
    requestId: string
  }): Promise<{ lesson: RawLesson }>

  complete(input: {
    familyId: string
    lessonId: string
    requestId: string
  }): Promise<{ lesson: RawLesson; remainingLessons: number; operationId: string }>

  undoCompletion(input: {
    familyId: string
    lessonId: string
    operationId: string
    requestId: string
  }): Promise<{ lesson: RawLesson; remainingLessons: number; operationId: string }>
}

export interface LessonDetail {
  lesson: Lesson
  course: { id: string; name: string; remainingLessons: number; version: number } | null
  reminderMemberIds: string[]
  learningRecord: unknown | null
}

function api(): LessonCloudObject {
  return cloudObject<LessonCloudObject>('lesson')
}

function mapLesson(raw: RawLesson): Lesson {
  return {
    id: raw._id,
    courseId: raw.course_id,
    plannedAt: raw.planned_at,
    actualAt: raw.actual_at,
    status: raw.status,
  }
}

export async function listLessons(
  familyId: string,
  from: string,
  to: string,
): Promise<Lesson[]> {
  const result = await api().listWindow({ familyId, from, to })
  return result.lessons.map(mapLesson)
}

export async function lessonDetail(
  familyId: string,
  lessonId: string,
): Promise<LessonDetail> {
  const result = await api().detail({ familyId, lessonId })
  return {
    lesson: mapLesson(result.lesson),
    course: result.course
      ? {
          id: result.course._id,
          name: result.course.name,
          remainingLessons: result.course.remaining_lessons,
          version: result.course.version,
        }
      : null,
    reminderMemberIds: result.reminderMembers,
    learningRecord: result.learningRecord,
  }
}

export async function adjustLesson(
  familyId: string,
  lessonId: string,
  action: 'reschedule' | 'leave' | 'cancel',
  requestId: string,
  actualAt?: string,
): Promise<Lesson> {
  const result = await api().adjust({ familyId, lessonId, action, actualAt, requestId })
  return mapLesson(result.lesson)
}

export interface CompletionResult {
  lesson: Lesson
  remainingLessons: number
  operationId: string
}

export async function completeLesson(
  familyId: string,
  lessonId: string,
  requestId: string,
): Promise<CompletionResult> {
  const result = await api().complete({ familyId, lessonId, requestId })
  return {
    lesson: mapLesson(result.lesson),
    remainingLessons: result.remainingLessons,
    operationId: result.operationId,
  }
}

export async function undoCompletion(
  familyId: string,
  lessonId: string,
  operationId: string,
  requestId: string,
): Promise<CompletionResult> {
  const result = await api().undoCompletion({ familyId, lessonId, operationId, requestId })
  return {
    lesson: mapLesson(result.lesson),
    remainingLessons: result.remainingLessons,
    operationId: result.operationId,
  }
}

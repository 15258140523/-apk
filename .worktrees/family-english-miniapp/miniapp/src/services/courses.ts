import type { Course, Lesson } from '../domain/model'
import type { WeeklyRule } from '../domain/schedule'
import { cloudObject } from './cloud'

interface RawLesson {
  _id: string
  course_id: string
  planned_at: string
  actual_at: string
  status: Lesson['status']
}

interface RawCourse {
  _id: string
  family_id: string
  name: string
  remaining_lessons: number
  version: number
  next_lesson?: RawLesson | null
}

interface RawRule extends WeeklyRule {
  _id: string
}

interface CourseCloudObject {
  create(input: CourseMutation): Promise<{ course: RawCourse }>
  update(input: CourseMutation & { courseId: string; version: number }): Promise<{ course: RawCourse }>
  list(input: { familyId: string }): Promise<{ courses: RawCourse[] }>
  detail(input: { familyId: string; courseId: string }): Promise<{
    course: RawCourse
    rule: RawRule | null
    reminderMembers: string[]
    lessons: RawLesson[]
  }>
  archive(input: {
    familyId: string
    courseId: string
    requestId: string
  }): Promise<{ archived: true }>
}

export interface CourseMutation {
  familyId: string
  name: string
  remainingLessons: number
  weeklyRule: WeeklyRule
  reminderMemberIds: string[]
}

export interface CourseDetail {
  course: Course
  rule: WeeklyRule | null
  reminderMemberIds: string[]
  lessons: Lesson[]
}

function api(): CourseCloudObject {
  return cloudObject<CourseCloudObject>('course')
}

function mapLesson(value: RawLesson): Lesson {
  return {
    id: value._id,
    courseId: value.course_id,
    plannedAt: value.planned_at,
    actualAt: value.actual_at,
    status: value.status,
  }
}

function mapCourse(value: RawCourse): Course {
  return {
    id: value._id,
    familyId: value.family_id,
    name: value.name,
    remainingLessons: value.remaining_lessons,
    version: value.version,
    nextLesson: value.next_lesson ? mapLesson(value.next_lesson) : null,
  }
}

export async function listCourses(familyId: string): Promise<Course[]> {
  const result = await api().list({ familyId })
  return result.courses.map(mapCourse)
}

export async function createCourse(input: CourseMutation): Promise<Course> {
  return mapCourse((await api().create(input)).course)
}

export async function updateCourse(
  input: CourseMutation & { courseId: string; version: number },
): Promise<Course> {
  return mapCourse((await api().update(input)).course)
}

export async function courseDetail(familyId: string, courseId: string): Promise<CourseDetail> {
  const result = await api().detail({ familyId, courseId })
  return {
    course: mapCourse(result.course),
    rule: result.rule
      ? {
          weekday: result.rule.weekday,
          hour: result.rule.hour,
          minute: result.rule.minute,
        }
      : null,
    reminderMemberIds: result.reminderMembers,
    lessons: result.lessons.map(mapLesson),
  }
}

export async function archiveCourse(familyId: string, courseId: string, requestId: string) {
  return api().archive({ familyId, courseId, requestId })
}

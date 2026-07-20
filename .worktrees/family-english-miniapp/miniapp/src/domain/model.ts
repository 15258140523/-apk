export const APP_NAME = '英语学习账本'

export type Role = 'owner' | 'admin' | 'viewer'
export type LessonStatus = 'pending' | 'completed' | 'leave' | 'cancelled' | 'rescheduled'
export type AttachmentKind = 'video' | 'image' | 'pdf'

export interface FamilyMember {
  id: string
  familyId: string
  displayName: string
  role: Role
  active: boolean
}

export interface Family {
  id: string
  familyId: string
  childName: string
  ownerUserId: string
  status: 'active' | 'deleting'
  deleteAfter?: number | null
}

export interface Course {
  id: string
  familyId: string
  name: string
  remainingLessons: number
  version: number
  nextLesson?: Lesson | null
}

export interface Lesson {
  id: string
  courseId: string
  plannedAt: string
  actualAt: string
  status: LessonStatus
}

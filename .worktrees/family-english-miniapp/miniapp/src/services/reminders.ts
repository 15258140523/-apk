import { cloudObject } from './cloud'

interface ReminderCloudObject {
  getCoursePreferences(input: {
    familyId: string
    courseId: string
  }): Promise<{ members: { memberId: string; enabled: boolean }[] }>

  setCoursePreferences(input: {
    familyId: string
    courseId: string
    memberIds: string[]
    reminderOffset?: number
  }): Promise<{ success: boolean }>

  recordSubscriptionResult(input: {
    familyId: string
    courseId: string
    memberId: string
    result: 'accept' | 'reject' | 'ban'
  }): Promise<{ success: boolean }>
}

function api(): ReminderCloudObject {
  return cloudObject<ReminderCloudObject>('reminder')
}

export async function getCoursePreferences(
  familyId: string,
  courseId: string,
): Promise<{ memberId: string; enabled: boolean }[]> {
  const result = await api().getCoursePreferences({ familyId, courseId })
  return result.members
}

export async function setCoursePreferences(
  familyId: string,
  courseId: string,
  memberIds: string[],
  reminderOffset?: number,
): Promise<void> {
  await api().setCoursePreferences({ familyId, courseId, memberIds, reminderOffset })
}

export async function recordSubscriptionResult(
  familyId: string,
  courseId: string,
  memberId: string,
  result: 'accept' | 'reject' | 'ban',
): Promise<void> {
  await api().recordSubscriptionResult({ familyId, courseId, memberId, result })
}

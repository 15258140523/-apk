import { cloudObject } from './cloud'

interface RawRecord {
  _id: string
  family_id: string
  course_id: string
  lesson_id: string | null
  title: string
  note: string
  tags: string[]
  cloud_links: string[]
  created_at: number
  updated_at: number
}

interface RawAttachment {
  _id: string
  record_id: string
  kind: string
  cloud_file_id: string
  bytes: number
}

interface LearningCloudObject {
  list(input: {
    familyId: string
    courseId?: string
    cursor?: string
    limit?: number
  }): Promise<{ records: RawRecord[]; nextCursor: string | null }>

  detail(input: {
    familyId: string
    recordId: string
  }): Promise<{ record: RawRecord; attachments: RawAttachment[] }>

  save(input: {
    familyId: string
    record: {
      id?: string
      courseId: string
      lessonId?: string
      title?: string
      note?: string
      tags?: string[]
      cloudLinks?: string[]
    }
    requestId: string
  }): Promise<{ record: RawRecord }>

  moveToRecycleBin(input: {
    familyId: string
    recordId: string
    requestId: string
  }): Promise<{ purgeAt: number }>
}

export interface LearningRecord {
  id: string
  familyId: string
  courseId: string
  lessonId: string | null
  title: string
  note: string
  tags: string[]
  cloudLinks: string[]
  createdAt: number
}

export interface Attachment {
  id: string
  recordId: string
  kind: string
  cloudFileId: string
  bytes: number
}

function api(): LearningCloudObject {
  return cloudObject<LearningCloudObject>('learning')
}

function mapRecord(raw: RawRecord): LearningRecord {
  return {
    id: raw._id,
    familyId: raw.family_id,
    courseId: raw.course_id,
    lessonId: raw.lesson_id,
    title: raw.title,
    note: raw.note,
    tags: raw.tags,
    cloudLinks: raw.cloud_links,
    createdAt: raw.created_at,
  }
}

function mapAttachment(raw: RawAttachment): Attachment {
  return {
    id: raw._id,
    recordId: raw.record_id,
    kind: raw.kind,
    cloudFileId: raw.cloud_file_id,
    bytes: raw.bytes,
  }
}

export async function listRecords(
  familyId: string,
  courseId?: string,
  cursor?: string,
  limit?: number,
): Promise<{ records: LearningRecord[]; nextCursor: string | null }> {
  const result = await api().list({ familyId, courseId, cursor, limit })
  return {
    records: result.records.map(mapRecord),
    nextCursor: result.nextCursor,
  }
}

export async function recordDetail(
  familyId: string,
  recordId: string,
): Promise<{ record: LearningRecord; attachments: Attachment[] }> {
  const result = await api().detail({ familyId, recordId })
  return {
    record: mapRecord(result.record),
    attachments: result.attachments.map(mapAttachment),
  }
}

export async function saveRecord(
  familyId: string,
  record: {
    id?: string
    courseId: string
    lessonId?: string
    title?: string
    note?: string
    tags?: string[]
    cloudLinks?: string[]
  },
  requestId: string,
): Promise<LearningRecord> {
  const result = await api().save({ familyId, record, requestId })
  return mapRecord(result.record)
}

export async function deleteRecord(
  familyId: string,
  recordId: string,
  requestId: string,
): Promise<number> {
  const result = await api().moveToRecycleBin({ familyId, recordId, requestId })
  return result.purgeAt
}

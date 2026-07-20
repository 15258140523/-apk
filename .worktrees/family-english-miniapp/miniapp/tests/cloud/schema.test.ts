import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const requiredFields: Record<string, string[]> = {
  families: ['child_name', 'owner_user_id', 'status', 'delete_after', 'renewal_due_at'],
  'family-members': ['user_id', 'display_name', 'role', 'active'],
  'family-invites': ['token_hash', 'role', 'expires_at', 'used_at', 'used_by'],
  'request-claims': ['request_id', 'action', 'actor_user_id', 'status', 'result'],
  courses: ['name', 'remaining_lessons', 'version', 'archived'],
  'course-reminder-members': ['course_id', 'member_id', 'enabled'],
  'schedule-rules': ['course_id', 'weekday', 'hour', 'minute', 'effective_from', 'effective_to'],
  lessons: ['course_id', 'occurrence_key', 'planned_at', 'actual_at', 'status', 'version'],
  'learning-records': ['course_id', 'lesson_id', 'title', 'note', 'tags', 'cloud_links', 'deleted_at'],
  attachments: ['record_id', 'kind', 'cloud_file_id', 'bytes', 'deleted_at'],
  'reminder-jobs': ['lesson_id', 'member_id', 'remind_at', 'unique_key', 'status', 'error_code'],
  'operation-logs': ['actor_user_id', 'action', 'entity_type', 'entity_id', 'payload', 'reversal_of'],
  'recycle-bin': ['entity_type', 'entity_id', 'snapshot', 'purge_at'],
}

const uniqueIndexes: Record<string, string[]> = {
  'family-invites': ['token_hash'],
  'request-claims': ['family_id', 'request_id'],
  lessons: ['occurrence_key'],
  'reminder-jobs': ['unique_key'],
}

function readJson(file: string) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

describe('database schemas', () => {
  for (const [name, businessFields] of Object.entries(requiredFields)) {
    it(`${name} is family-scoped and denies direct client access`, () => {
      const file = resolve('uniCloud-aliyun/database', `${name}.schema.json`)
      expect(existsSync(file)).toBe(true)
      const schema = readJson(file)

      expect(schema.required).toEqual(
        expect.arrayContaining(['family_id', 'created_at', 'updated_at', ...businessFields]),
      )
      expect(schema.permission).toEqual({
        read: false,
        create: false,
        update: false,
        delete: false,
      })
      for (const field of ['family_id', 'created_at', 'updated_at', ...businessFields]) {
        expect(schema.properties[field], `${name}.${field}`).toBeDefined()
      }
    })
  }

  for (const [name, fields] of Object.entries(uniqueIndexes)) {
    it(`${name} has its required unique index`, () => {
      const file = resolve('uniCloud-aliyun/database', `${name}.index.json`)
      expect(existsSync(file)).toBe(true)
      const indexes = readJson(file)
      expect(indexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            MgoKeySchema: expect.objectContaining({
              MgoIndexKeys: fields.map((field) => ({ Name: field, Direction: '1' })),
              MgoIsUnique: true,
            }),
          }),
        ]),
      )
    })
  }
})

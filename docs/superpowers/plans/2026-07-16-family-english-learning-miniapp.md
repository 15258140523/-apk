# Family English Learning Miniapp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared WeChat mini program for one family to manage one child's English courses, lesson balances, schedules, reminders, learning records, and private attachments without a fixed monthly cloud fee.

**Architecture:** A Vue 3 + TypeScript uni-app client calls small uniCloud cloud objects grouped by business capability. Pure domain rules are isolated from UI and database adapters so they can be tested locally; every security-sensitive write is re-authorized and committed server-side, with idempotency and immutable audit records.

**Tech Stack:** uni-app CLI (`vite-ts`), Vue 3, TypeScript, Pinia, uniCloud Alibaba, uni-id/uni-id-co, uni-open-bridge, uniCloud document database, Vitest, Vue Test Utils, uni-automator, WeChat Developer Tools.

---

## Scope and delivery order

This plan keeps the approved design as one coherent MVP. Tasks are ordered so each vertical slice can be run and tested before the next begins:

1. Tooling and test harness.
2. Shared domain rules.
3. Database schema and server authorization.
4. Family membership.
5. Courses and course-first home page.
6. Recurring schedules and calendar.
7. Transactional completion and undo.
8. Per-course reminder subscriptions.
9. Learning timeline and attachments.
10. Quota, recycle bin, export, and audit.
11. End-to-end verification and release runbook.

Do not add multi-child, institution, billing, AI, live-class, or native Android features while executing this plan.

## Planned file structure

```text
miniapp/
  package.json                         build and test scripts
  vite.config.ts                      uni-app/Vite configuration
  vitest.config.ts                    local unit/component test configuration
  src/
    App.vue                           login/bootstrap lifecycle
    main.ts                           Vue and Pinia initialization
    manifest.json                     WeChat mini-program configuration
    pages.json                        four-tab navigation and subpages
    domain/
      model.ts                        client-side domain types
      permissions.ts                  role capability rules
      schedule.ts                     recurrence and occurrence helpers
      lesson-state.ts                 valid status transitions
      quota.ts                        upload and quota decisions
      *.test.ts                       pure domain tests
    services/
      cloud.ts                        cloud-object acquisition and error mapping
      family.ts                       family client API
      courses.ts                      course client API
      lessons.ts                      schedule/lesson client API
      reminders.ts                    subscription client API
      learning.ts                     records/files client API
      exports.ts                      export client API
    stores/
      session.ts                      current user/family bootstrap state
      courses.ts                      home and course state
      calendar.ts                     visible week state
      learning.ts                     timeline/draft state
    components/
      CourseHeroCard.vue              next-course summary and complete action
      LessonListItem.vue              reusable lesson row
      MemberPicker.vue                per-course reminder member picker
      UploadQueue.vue                 attachment validation and progress
      LearningRecordCard.vue          timeline record rendering
    pages/
      bootstrap/index.vue             create/join/loading states
      home/index.vue                  course-first dashboard
      calendar/index.vue              week calendar and lesson list
      course/edit.vue                 course and recurrence editing
      course/detail.vue               lesson/course details and completion
      lesson/adjust.vue               reschedule/leave/cancel form
      learning/index.vue              filtered growth timeline
      learning/edit.vue               record editor and local draft
      family/index.vue                members, quota, export, audit
      family/member.vue               role management
  uniCloud-aliyun/
    database/
      families.schema.json
      family-members.schema.json
      family-invites.schema.json
      request-claims.schema.json
      courses.schema.json
      course-reminder-members.schema.json
      schedule-rules.schema.json
      lessons.schema.json
      learning-records.schema.json
      attachments.schema.json
      reminder-jobs.schema.json
      operation-logs.schema.json
      recycle-bin.schema.json
      *.index.json
    cloudfunctions/
      common/app-shared/
        auth.js                        family membership authorization
        errors.js                      stable public error codes
        idempotency.js                 request-key claim helper
        family-domain.js               invitation and role rules
        course-domain.js               course input rules
        lesson-domain.js               server lesson transition rules
        schedule-domain.js             server recurrence helpers
        reminder-domain.js             reminder keys and recipient filtering
        export-domain.js               export isolation and expiry rules
        audit.js                       append-only audit writer
      family/index.js                 family/member cloud object
      course/index.js                 course and recurrence cloud object
      lesson/index.js                 lesson, complete, undo, adjust cloud object
      reminder/index.js               preference and subscription cloud object
      reminder-dispatch/index.js      ten-minute scheduled sender
      reminder-dispatch/package.json timer trigger and runtime configuration
      learning/index.js               record and attachment cloud object
      data-export/index.js            JSON/CSV export cloud object
      maintenance/index.js            daily purge and renewal checks
      maintenance/package.json       daily maintenance trigger and runtime configuration
  tests/
    cloud/
      schema.test.ts
      family.test.ts
      course.test.ts
      lesson.test.ts
      reminder.test.ts
      learning.test.ts
      export.test.ts
    e2e/
      family-course-flow.test.js
docs/
  operations/uniCloud-free-tier-runbook.md
```

## Task 1: Scaffold the uni-app CLI project and test harness

**Files:**
- Create: `miniapp/` from the official `dcloudio/uni-preset-vue#vite-ts` template
- Modify: `miniapp/package.json`
- Create: `miniapp/vitest.config.ts`
- Create: `miniapp/src/test/setup.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Generate the official Vue 3 TypeScript project**

Run:

```bash
npx degit dcloudio/uni-preset-vue#vite-ts miniapp
npm --prefix miniapp install
npm --prefix miniapp install pinia
npm --prefix miniapp install --save-dev vitest @vue/test-utils happy-dom vue-tsc
```

Expected: `miniapp/src`, `miniapp/package.json`, and `miniapp/node_modules` exist; all commands exit 0.

- [ ] **Step 2: Add deterministic scripts and the test environment**

Add these scripts to `miniapp/package.json` without removing the template's platform scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "vue-tsc --noEmit",
    "build:mp-weixin": "uni build -p mp-weixin"
  }
}
```

Create `miniapp/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'tests/cloud/**/*.test.ts'],
  },
})
```

Create `miniapp/src/test/setup.ts`:

```ts
import { afterEach, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
})
```

Append to `.gitignore`:

```gitignore
miniapp/node_modules/
miniapp/dist/
miniapp/.hbuilderx/
miniapp/unpackage/
miniapp/uniCloud-aliyun/cloudfunctions/common/uni-config-center/uni-id/config.json
```

- [ ] **Step 3: Add a failing smoke test**

Create `miniapp/src/domain/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { APP_NAME } from './model'

describe('project', () => {
  it('has the approved product name', () => {
    expect(APP_NAME).toBe('英语学习账本')
  })
})
```

- [ ] **Step 4: Verify the smoke test fails**

Run: `npm --prefix miniapp test -- src/domain/smoke.test.ts`

Expected: FAIL because `src/domain/model.ts` does not exist.

- [ ] **Step 5: Add the minimal domain entry point**

Create `miniapp/src/domain/model.ts`:

```ts
export const APP_NAME = '英语学习账本'
```

- [ ] **Step 6: Verify the scaffold**

Run:

```bash
npm --prefix miniapp test
npm --prefix miniapp run typecheck
npm --prefix miniapp run build:mp-weixin
```

Expected: tests PASS, typecheck exits 0, and `miniapp/dist/build/mp-weixin/app.json` exists.

- [ ] **Step 7: Commit**

```bash
git add .gitignore miniapp
git commit -m "build: scaffold uni-app mini program"
```

## Task 2: Define domain models, permissions, lesson transitions, and quota rules

**Files:**
- Modify: `miniapp/src/domain/model.ts`
- Create: `miniapp/src/domain/permissions.ts`
- Create: `miniapp/src/domain/permissions.test.ts`
- Create: `miniapp/src/domain/lesson-state.ts`
- Create: `miniapp/src/domain/lesson-state.test.ts`
- Create: `miniapp/src/domain/quota.ts`
- Create: `miniapp/src/domain/quota.test.ts`

- [ ] **Step 1: Write failing permission and state tests**

Create `miniapp/src/domain/permissions.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { can } from './permissions'

describe('permissions', () => {
  it('lets admins complete lessons but not assign admins', () => {
    expect(can('admin', 'lesson.complete')).toBe(true)
    expect(can('admin', 'member.assignAdmin')).toBe(false)
  })

  it('keeps viewers read-only', () => {
    expect(can('viewer', 'family.read')).toBe(true)
    expect(can('viewer', 'course.write')).toBe(false)
  })
})
```

Create `miniapp/src/domain/lesson-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { assertTransition } from './lesson-state'

describe('lesson transitions', () => {
  it('allows pending to completed', () => {
    expect(() => assertTransition('pending', 'completed')).not.toThrow()
  })

  it('rejects a second completion', () => {
    expect(() => assertTransition('completed', 'completed')).toThrow('LESSON_ALREADY_COMPLETED')
  })
})
```

Create `miniapp/src/domain/quota.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { quotaDecision, validateAttachment } from './quota'

describe('quota', () => {
  it('blocks files but not text at 95 percent', () => {
    expect(quotaDecision(0.96)).toEqual({ warn: true, allowFileUpload: false })
  })

  it('rejects an oversized short video', () => {
    expect(() => validateAttachment('video', 31 * 1024 * 1024, 59)).toThrow('VIDEO_TOO_LARGE')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm --prefix miniapp test -- src/domain/permissions.test.ts src/domain/lesson-state.test.ts src/domain/quota.test.ts`

Expected: FAIL because the three implementation modules do not exist.

- [ ] **Step 3: Define shared client types**

Replace `miniapp/src/domain/model.ts` with:

```ts
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

export interface Course {
  id: string
  familyId: string
  name: string
  remainingLessons: number
  version: number
}

export interface Lesson {
  id: string
  courseId: string
  plannedAt: string
  actualAt: string
  status: LessonStatus
}
```

- [ ] **Step 4: Implement the permission matrix**

Create `miniapp/src/domain/permissions.ts`:

```ts
import type { Role } from './model'

export type Capability =
  | 'family.read'
  | 'course.write'
  | 'lesson.complete'
  | 'learning.write'
  | 'member.inviteViewer'
  | 'member.assignAdmin'
  | 'family.delete'

const grants: Record<Role, ReadonlySet<Capability>> = {
  owner: new Set(['family.read', 'course.write', 'lesson.complete', 'learning.write', 'member.inviteViewer', 'member.assignAdmin', 'family.delete']),
  admin: new Set(['family.read', 'course.write', 'lesson.complete', 'learning.write', 'member.inviteViewer']),
  viewer: new Set(['family.read']),
}

export function can(role: Role, capability: Capability): boolean {
  return grants[role].has(capability)
}
```

- [ ] **Step 5: Implement transitions and quota rules**

Create `miniapp/src/domain/lesson-state.ts`:

```ts
import type { LessonStatus } from './model'

const allowed: Record<LessonStatus, ReadonlySet<LessonStatus>> = {
  pending: new Set(['completed', 'leave', 'cancelled', 'rescheduled']),
  rescheduled: new Set(['completed', 'leave', 'cancelled']),
  completed: new Set(['pending']),
  leave: new Set(['pending', 'rescheduled']),
  cancelled: new Set(['pending', 'rescheduled']),
}

export function assertTransition(from: LessonStatus, to: LessonStatus): void {
  if (from === 'completed' && to === 'completed') throw new Error('LESSON_ALREADY_COMPLETED')
  if (!allowed[from].has(to)) throw new Error('INVALID_LESSON_TRANSITION')
}
```

Create `miniapp/src/domain/quota.ts`:

```ts
import type { AttachmentKind } from './model'

const MB = 1024 * 1024

export function quotaDecision(ratio: number) {
  return { warn: ratio >= 0.8, allowFileUpload: ratio < 0.95 }
}

export function validateAttachment(kind: AttachmentKind, bytes: number, durationSeconds = 0): void {
  if (kind === 'video' && bytes > 30 * MB) throw new Error('VIDEO_TOO_LARGE')
  if (kind === 'video' && durationSeconds > 60) throw new Error('VIDEO_TOO_LONG')
  if (kind === 'pdf' && bytes > 10 * MB) throw new Error('PDF_TOO_LARGE')
}
```

- [ ] **Step 6: Run tests and commit**

Run: `npm --prefix miniapp test -- src/domain`

Expected: all domain tests PASS.

```bash
git add miniapp/src/domain
git commit -m "feat: define core domain rules"
```

## Task 3: Implement recurring schedule calculations

**Files:**
- Create: `miniapp/src/domain/schedule.ts`
- Create: `miniapp/src/domain/schedule.test.ts`
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/schedule-domain.js`

- [ ] **Step 1: Write failing recurrence tests**

Create `miniapp/src/domain/schedule.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { weeklyOccurrences } from './schedule'

describe('weeklyOccurrences', () => {
  it('creates Saturdays inside the requested window', () => {
    expect(weeklyOccurrences({ weekday: 6, hour: 10, minute: 0 }, '2026-07-01', '2026-07-20')).toEqual([
      '2026-07-04T10:00:00+08:00',
      '2026-07-11T10:00:00+08:00',
      '2026-07-18T10:00:00+08:00',
    ])
  })
})
```

- [ ] **Step 2: Verify the recurrence test fails**

Run: `npm --prefix miniapp test -- src/domain/schedule.test.ts`

Expected: FAIL because `weeklyOccurrences` is missing.

- [ ] **Step 3: Implement the recurrence helper**

Create `miniapp/src/domain/schedule.ts`:

```ts
export interface WeeklyRule {
  weekday: number
  hour: number
  minute: number
}

function localDate(value: string): Date {
  return new Date(`${value}T12:00:00+08:00`)
}

function format(date: Date, hour: number, minute: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`
}

export function weeklyOccurrences(rule: WeeklyRule, from: string, to: string): string[] {
  const cursor = localDate(from)
  const end = localDate(to)
  while (cursor.getUTCDay() !== rule.weekday) cursor.setUTCDate(cursor.getUTCDate() + 1)
  const result: string[] = []
  while (cursor <= end) {
    result.push(format(cursor, rule.hour, rule.minute))
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }
  return result
}
```

- [ ] **Step 4: Add the server copy with the same contract**

Create `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/schedule-domain.js`:

```js
'use strict'

function occurrenceKey(courseId, plannedAt) {
  return `${courseId}:${plannedAt}`
}

module.exports = { occurrenceKey }
```

- [ ] **Step 5: Verify and commit**

Run: `npm --prefix miniapp test -- src/domain/schedule.test.ts`

Expected: PASS with three Saturday occurrences.

```bash
git add miniapp/src/domain/schedule.ts miniapp/src/domain/schedule.test.ts miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/schedule-domain.js
git commit -m "feat: add weekly schedule calculations"
```

## Task 4: Create database schemas, indexes, and shared cloud errors

**Files:**
- Create: all `miniapp/uniCloud-aliyun/database/*.schema.json` and `*.index.json` files listed above
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/errors.js`
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/auth.js`
- Create: `miniapp/tests/cloud/schema.test.ts`

- [ ] **Step 1: Write a failing schema inventory test**

Create `miniapp/tests/cloud/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const collections = ['families', 'family-members', 'family-invites', 'request-claims', 'courses', 'course-reminder-members', 'schedule-rules', 'lessons', 'learning-records', 'attachments', 'reminder-jobs', 'operation-logs', 'recycle-bin']

describe('database schemas', () => {
  for (const name of collections) {
    it(`${name} requires family_id`, () => {
      const file = resolve('miniapp/uniCloud-aliyun/database', `${name}.schema.json`)
      expect(existsSync(file)).toBe(true)
      const schema = JSON.parse(readFileSync(file, 'utf8'))
      expect(schema.required).toContain('family_id')
    })
  }
})
```

- [ ] **Step 2: Run the inventory test and verify failure**

Run: `npm --prefix miniapp test -- tests/cloud/schema.test.ts`

Expected: FAIL because schema files are absent.

- [ ] **Step 3: Create schemas with deny-by-default client writes**

Start every collection schema with these common fields and deny-by-default client permissions:

```json
{
  "bsonType": "object",
  "required": ["family_id", "created_at", "updated_at"],
  "permission": {
    "read": false,
    "create": false,
    "update": false,
    "delete": false
  },
  "properties": {
    "_id": { "description": "database id" },
    "family_id": { "bsonType": "string" },
    "created_at": { "bsonType": "timestamp" },
    "updated_at": { "bsonType": "timestamp" }
  }
}
```

Add the following required business fields with the stated BSON types; nullable timestamps use `["timestamp", "null"]`:

| Collection | Required business fields |
| --- | --- |
| `families` | `child_name:string`, `owner_user_id:string`, `status:string`, `delete_after:[timestamp,null]`, `renewal_due_at:[timestamp,null]` |
| `family-members` | `user_id:string`, `display_name:string`, `role:string`, `active:bool` |
| `family-invites` | `token_hash:string`, `role:string`, `expires_at:timestamp`, `used_at:[timestamp,null]`, `used_by:[string,null]` |
| `request-claims` | `request_id:string`, `action:string`, `actor_user_id:string`, `status:string`, `result:[object,null]` |
| `courses` | `name:string`, `remaining_lessons:int`, `version:int`, `archived:bool` |
| `course-reminder-members` | `course_id:string`, `member_id:string`, `enabled:bool` |
| `schedule-rules` | `course_id:string`, `weekday:int`, `hour:int`, `minute:int`, `effective_from:timestamp`, `effective_to:[timestamp,null]` |
| `lessons` | `course_id:string`, `occurrence_key:string`, `planned_at:timestamp`, `actual_at:timestamp`, `status:string`, `version:int` |
| `learning-records` | `course_id:string`, `lesson_id:string`, `title:string`, `note:string`, `tags:array`, `cloud_links:array`, `deleted_at:[timestamp,null]` |
| `attachments` | `record_id:string`, `kind:string`, `cloud_file_id:string`, `bytes:int`, `deleted_at:[timestamp,null]` |
| `reminder-jobs` | `lesson_id:string`, `member_id:string`, `remind_at:timestamp`, `unique_key:string`, `status:string`, `error_code:[string,null]` |
| `operation-logs` | `actor_user_id:string`, `action:string`, `entity_type:string`, `entity_id:string`, `payload:object`, `reversal_of:[string,null]` |
| `recycle-bin` | `entity_type:string`, `entity_id:string`, `snapshot:object`, `purge_at:timestamp` |

Create unique indexes for `family-invites.token_hash`, `(request-claims.family_id, request_id)`, `lessons.occurrence_key`, and `reminder-jobs.unique_key`, plus compound indexes on `(family_id, updated_at)` for lists.

- [ ] **Step 4: Create stable server errors and authorization**

Create `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/errors.js`:

```js
'use strict'

function appError(code, message) {
  const error = new Error(message)
  error.errCode = code
  return error
}

module.exports = { appError }
```

Create `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/auth.js`:

```js
'use strict'
const { appError } = require('./errors')

async function requireMember(db, userId, familyId, roles) {
  if (!userId) throw appError('AUTH_REQUIRED', '请先登录')
  const result = await db.collection('family-members').where({ family_id: familyId, user_id: userId, active: true }).limit(1).get()
  const member = result.data[0]
  if (!member) throw appError('FAMILY_FORBIDDEN', '你已不是该家庭成员')
  if (roles && !roles.includes(member.role)) throw appError('ROLE_FORBIDDEN', '当前角色不能执行此操作')
  return member
}

module.exports = { requireMember }
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm --prefix miniapp test -- tests/cloud/schema.test.ts
npm --prefix miniapp test
```

Expected: schema inventory and all existing tests PASS.

```bash
git add miniapp
git commit -m "feat: define cloud database boundaries"
```

## Task 5: Implement login bootstrap, family creation, invitations, and roles

**Files:**
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/family/index.js`
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/family-domain.js`
- Create: `miniapp/tests/cloud/family.test.ts`
- Create: `miniapp/src/services/cloud.ts`
- Create: `miniapp/src/services/family.ts`
- Create: `miniapp/src/stores/session.ts`
- Modify: `miniapp/src/App.vue`
- Create: `miniapp/src/pages/bootstrap/index.vue`
- Create: `miniapp/src/pages/family/member.vue`

- [ ] **Step 1: Write failing family service tests**

Create `miniapp/tests/cloud/family.test.ts` with these direct domain assertions:

```ts
import { describe, expect, it } from 'vitest'
import familyDomain from '../../uniCloud-aliyun/cloudfunctions/common/app-shared/family-domain.js'

const { assertCanAssignRole, inviteExpiresAt } = familyDomain

describe('family rules', () => {
  it('prevents an admin from promoting another member', () => {
    expect(() => assertCanAssignRole('admin', 'admin')).toThrow('ROLE_FORBIDDEN')
  })

  it('makes an invitation single-use for 24 hours', () => {
    const issuedAt = Date.parse('2026-07-16T10:00:00+08:00')
    expect(inviteExpiresAt(issuedAt)).toBe(Date.parse('2026-07-17T10:00:00+08:00'))
  })
})
```

- [ ] **Step 2: Run the family test and verify failure**

Run: `npm --prefix miniapp test -- tests/cloud/family.test.ts`

Expected: FAIL because `family-domain.js` does not exist.

- [ ] **Step 3: Implement the pure family rules**

Create `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/family-domain.js`:

```js
'use strict'

function assertCanAssignRole(actorRole, targetRole) {
  if (actorRole !== 'owner') throw new Error('ROLE_FORBIDDEN')
  if (!['admin', 'viewer'].includes(targetRole)) throw new Error('INVALID_TARGET_ROLE')
}

function inviteExpiresAt(issuedAt) {
  return issuedAt + 24 * 60 * 60 * 1000
}

module.exports = { assertCanAssignRole, inviteExpiresAt }
```

- [ ] **Step 4: Add the family cloud object**

Expose these exact public methods in `family/index.js`:

| Method | Authorization | Required behavior | Return value |
| --- | --- | --- | --- |
| `createFamily({ childName, requestId })` | logged-in user without an active family | trim and validate child name; transactionally create family and one owner membership; claim request ID | `{ family, member }` |
| `getCurrentFamily()` | logged-in user | find the active membership and its non-deleted family | `{ family, member }` or `null` |
| `createInvite({ familyId })` | owner/admin | create a cryptographically random token, store only its hash, expire after 24 hours, default role viewer | `{ token, expiresAt }` |
| `acceptInvite({ token })` | logged-in user | transactionally claim one unused token and create one viewer membership | `{ family, member }` |
| `listMembers({ familyId })` | active member | list active members without exposing authentication secrets | `{ members }` |
| `changeRole({ familyId, memberId, role })` | owner | allow only admin/viewer targets; never demote the sole owner | `{ member }` |
| `removeMember({ familyId, memberId })` | owner, or admin removing self | deactivate membership; never remove the sole owner | `{ removed: true }` |
| `requestDelete({ familyId, childName })` | owner | require exact child-name match; set status deleting and `delete_after` to 30 days | `{ deleteAfter }` |
| `restoreFamily({ familyId })` | original owner | clear deletion state before `delete_after` | `{ restored: true }` |

Every method uses `requireMember` where a family already exists. Wrap family creation, invite acceptance, role changes, and deletion state changes in transactions and append operation logs for security-relevant changes.

- [ ] **Step 5: Add uni-id bootstrap, typed client wrappers, and session state**

Import the official `uni-id-pages` and `uni-open-bridge` plugins into the CLI project, place `uni-id-co` and `uni-open-bridge` under `miniapp/uniCloud-aliyun/cloudfunctions`, and configure the ignored uni-id config with the WeChat AppID and secret.

Update `miniapp/src/App.vue` with the secure-network handshake:

```vue
<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useSessionStore } from './stores/session'

onLaunch(async () => {
  // #ifdef MP-WEIXIN
  const current = uniCloud.getCurrentUserInfo()
  await uniCloud.initSecureNetworkByWeixin({
    callLoginByWeixin: current.tokenExpired < Date.now(),
  })
  // #endif
  await useSessionStore().bootstrap()
})
</script>
```

Create `miniapp/src/services/cloud.ts`:

```ts
export function cloudObject<T>(name: string): T {
  return uniCloud.importObject(name) as T
}

export function publicMessage(error: unknown): string {
  const value = error as { errMsg?: string; message?: string }
  return value.errMsg ?? value.message ?? '操作失败，请稍后重试'
}
```

Create `miniapp/src/services/family.ts` with typed wrappers for the eight cloud methods, then create a Pinia `session` store with `bootstrap`, `family`, `members`, `loading`, and `error` state.

- [ ] **Step 6: Build the bootstrap and role-management pages**

`bootstrap/index.vue` must render exactly three states: loading, create-family form, and joined-family redirect. `family/member.vue` must hide role controls unless the current role is `owner`; the server remains authoritative even when controls are hidden.

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm --prefix miniapp test -- tests/cloud/family.test.ts
npm --prefix miniapp run typecheck
npm --prefix miniapp run build:mp-weixin
```

Expected: tests PASS; both pages appear in compiled `app.json`.

```bash
git add miniapp
git commit -m "feat: add family membership and roles"
```

## Task 6: Implement courses and the course-first home page

**Files:**
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/course/index.js`
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/course-domain.js`
- Create: `miniapp/tests/cloud/course.test.ts`
- Create: `miniapp/src/services/courses.ts`
- Create: `miniapp/src/stores/courses.ts`
- Create: `miniapp/src/components/CourseHeroCard.vue`
- Create: `miniapp/src/pages/home/index.vue`
- Create: `miniapp/src/pages/course/edit.vue`
- Modify: `miniapp/src/pages.json`

- [ ] **Step 1: Write failing course validation tests**

Create `miniapp/tests/cloud/course.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import courseDomain from '../../uniCloud-aliyun/cloudfunctions/common/app-shared/course-domain.js'

const { validateCourseInput } = courseDomain

describe('course validation', () => {
  it('accepts a named course with a nonnegative balance', () => {
    expect(validateCourseInput('外教口语', 8)).toEqual({ name: '外教口语', remainingLessons: 8 })
  })

  it('rejects negative balances', () => {
    expect(() => validateCourseInput('外教口语', -1)).toThrow('INVALID_REMAINING_LESSONS')
  })
})
```

- [ ] **Step 2: Run the course test and verify failure**

Run: `npm --prefix miniapp test -- tests/cloud/course.test.ts`

Expected: FAIL because `course-domain.js` does not exist.

- [ ] **Step 3: Implement course input rules**

Create `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/course-domain.js`:

```js
'use strict'

function validateCourseInput(name, remainingLessons) {
  const normalized = String(name || '').trim()
  if (!normalized) throw new Error('COURSE_NAME_REQUIRED')
  if (!Number.isInteger(remainingLessons) || remainingLessons < 0) throw new Error('INVALID_REMAINING_LESSONS')
  return { name: normalized, remainingLessons }
}

module.exports = { validateCourseInput }
```

- [ ] **Step 4: Implement course methods**

`course/index.js` exposes the following contracts:

| Method | Authorization | Required behavior | Return value |
| --- | --- | --- | --- |
| `create(input)` | owner/admin | validate name and nonnegative integer balance; create course, weekly rule, and enabled reminder members in one transaction | `{ course }` |
| `update(input)` | owner/admin | condition on `courseId`, `familyId`, and `version`; replace weekly rule and reminder membership atomically; increment version | `{ course }` |
| `list({ familyId })` | active member | return non-archived courses with the next pending lesson | `{ courses }` |
| `detail({ familyId, courseId })` | active member | return course, active rule, reminder members, and recent lessons | `{ course, rule, reminderMembers, lessons }` |
| `archive({ familyId, courseId, requestId })` | owner/admin | mark archived without deleting lessons or learning history; append audit log | `{ archived: true }` |

`create` and `update` accept `name`, `remainingLessons`, `weeklyRule`, and `reminderMemberIds`. Validate every reminder member belongs to the same family. A stale version returns `COURSE_VERSION_CONFLICT` with the latest server version.

- [ ] **Step 5: Build the course store and home page**

The store exposes `load`, `nextCourse`, `otherCourses`, and `refreshAfterLessonChange`. `home/index.vue` renders `CourseHeroCard` for the earliest pending lesson, other courses below it, and the latest learning record preview. No fake data remains after the store loads.

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm --prefix miniapp test -- tests/cloud/course.test.ts
npm --prefix miniapp run typecheck
npm --prefix miniapp run build:mp-weixin
```

Expected: PASS and the home page is the first tab in compiled `app.json`.

```bash
git add miniapp
git commit -m "feat: add courses and home dashboard"
```

## Task 7: Implement lesson materialization, calendar, and single-occurrence adjustments

**Files:**
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/lesson/index.js`
- Create: `miniapp/tests/cloud/lesson.test.ts`
- Create: `miniapp/src/services/lessons.ts`
- Create: `miniapp/src/stores/calendar.ts`
- Create: `miniapp/src/components/LessonListItem.vue`
- Create: `miniapp/src/pages/calendar/index.vue`
- Create: `miniapp/src/pages/lesson/adjust.vue`

- [ ] **Step 1: Write failing lesson occurrence tests**

Create `miniapp/tests/cloud/lesson.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import lessonDomain from '../../uniCloud-aliyun/cloudfunctions/common/app-shared/lesson-domain.js'

const { applySingleAdjustment } = lessonDomain

describe('single occurrence adjustment', () => {
  it('changes one actual time without changing the weekly rule', () => {
    const rule = { weekday: 0, hour: 15, minute: 30 }
    const lesson = applySingleAdjustment(
      { planned_at: '2026-07-19T15:30:00+08:00', actual_at: '2026-07-19T15:30:00+08:00', status: 'pending' },
      'reschedule',
      '2026-07-19T16:30:00+08:00',
    )
    expect(rule).toEqual({ weekday: 0, hour: 15, minute: 30 })
    expect(lesson.actual_at).not.toBe(lesson.planned_at)
  })
})
```

- [ ] **Step 2: Run the adjustment test and verify failure**

Run: `npm --prefix miniapp test -- tests/cloud/lesson.test.ts`

Expected: FAIL because `lesson-domain.js` does not exist.

- [ ] **Step 3: Implement the pure single-adjustment rule**

Create `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/lesson-domain.js`:

```js
'use strict'

function applySingleAdjustment(lesson, action, actualAt) {
  if (!['reschedule', 'leave', 'cancel'].includes(action)) throw new Error('INVALID_ADJUST_ACTION')
  if (action === 'reschedule' && !actualAt) throw new Error('ACTUAL_TIME_REQUIRED')
  if (action !== 'reschedule' && actualAt) throw new Error('ACTUAL_TIME_NOT_ALLOWED')
  if (action === 'reschedule') return { ...lesson, actual_at: actualAt, status: 'rescheduled' }
  if (action === 'leave') return { ...lesson, status: 'leave' }
  return { ...lesson, status: 'cancelled' }
}

function completionPlan(lesson, remainingLessons) {
  if (lesson.status === 'completed') throw new Error('LESSON_ALREADY_COMPLETED')
  if (!['pending', 'rescheduled'].includes(lesson.status)) throw new Error('INVALID_LESSON_TRANSITION')
  if (remainingLessons <= 0) throw new Error('NO_REMAINING_LESSONS')
  return { lessonStatus: 'completed', remainingLessons: remainingLessons - 1 }
}

module.exports = { applySingleAdjustment, completionPlan }
```

- [ ] **Step 4: Implement lesson window materialization and adjustment**

Add these methods to `lesson/index.js`:

| Method | Authorization | Required behavior | Return value |
| --- | --- | --- | --- |
| `listWindow({ familyId, from, to })` | active member | limit window to 62 days; materialize missing occurrences by unique key; return ordered lessons | `{ lessons }` |
| `detail({ familyId, lessonId })` | active member | return lesson, course balance, reminder members, and linked learning record | `{ lesson, course, reminderMembers, learningRecord }` |
| `adjust({ familyId, lessonId, action, actualAt, requestId })` | owner/admin | accept only reschedule/leave/cancel; update one lesson and audit it | `{ lesson }` |

`listWindow` upserts by `occurrence_key`. Reschedule requires a valid `actualAt`; leave and cancel reject `actualAt`. Never mutate `schedule-rules` from `adjust`.

- [ ] **Step 5: Build the calendar experience**

`calendar/index.vue` shows the selected week, groups lessons by day, and opens `lesson/adjust.vue`. The adjustment page includes the explicit text “仅修改本次课程” and shows the original time when rescheduled.

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm --prefix miniapp test -- tests/cloud/lesson.test.ts src/domain/schedule.test.ts
npm --prefix miniapp run typecheck
```

Expected: PASS.

```bash
git add miniapp
git commit -m "feat: add recurring lesson calendar"
```

## Task 8: Implement transactional completion, idempotency, undo, and audit

**Files:**
- Modify: `miniapp/uniCloud-aliyun/cloudfunctions/lesson/index.js`
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/idempotency.js`
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/audit.js`
- Modify: `miniapp/tests/cloud/lesson.test.ts`
- Create: `miniapp/src/pages/course/detail.vue`
- Modify: `miniapp/src/components/CourseHeroCard.vue`

- [ ] **Step 1: Add failing concurrency and undo tests**

Append to `miniapp/tests/cloud/lesson.test.ts`:

```ts
import idempotency from '../../uniCloud-aliyun/cloudfunctions/common/app-shared/idempotency.js'

it('creates one stable claim key per family and request', () => {
  expect(idempotency.requestClaimKey('f1', 'r1')).toBe('f1:r1')
})

it('plans one balance decrement for a pending lesson', () => {
  expect(lessonDomain.completionPlan({ status: 'pending' }, 8)).toEqual({ lessonStatus: 'completed', remainingLessons: 7 })
})
```

- [ ] **Step 2: Run the new tests and verify failure**

Run: `npm --prefix miniapp test -- tests/cloud/lesson.test.ts`

Expected: FAIL because `idempotency.js` does not exist.

- [ ] **Step 3: Implement idempotency and audit helpers**

Create `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/idempotency.js`:

```js
'use strict'

function requestClaimKey(familyId, requestId) {
  if (!familyId || !requestId) throw new Error('REQUEST_ID_REQUIRED')
  return `${familyId}:${requestId}`
}

module.exports = { requestClaimKey }
```

Create `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/audit.js`:

```js
'use strict'

async function appendAudit(transaction, entry) {
  const now = Date.now()
  return transaction.collection('operation-logs').add({ ...entry, created_at: now, updated_at: now })
}

module.exports = { appendAudit }
```

- [ ] **Step 4: Add completion and undo methods**

Extend `lesson/index.js` with `complete({ familyId, lessonId, requestId })` and `undoCompletion({ familyId, lessonId, operationId, requestId })`.

Both methods require owner/admin and run inside database transactions. `complete` claims the request ID, conditions on lesson status and course version, decrements one lesson, and appends `lesson.complete`; it returns `{ lesson, remainingLessons, operationId }`. `undoCompletion` verifies the referenced operation is unreversed, restores one lesson, resets status to pending, and appends `lesson.undo` with `reversal_of`; it returns `{ lesson, remainingLessons, operationId }`.

- [ ] **Step 5: Build the two-choice confirmation sheet**

`course/detail.vue` displays the exact balance transition and buttons “完成并添加学习记录” and “仅扣除课时”. Disable both buttons after the first tap until the cloud response returns. On timeout, query lesson detail before allowing another attempt.

- [ ] **Step 6: Verify and commit**

Run: `npm --prefix miniapp test -- tests/cloud/lesson.test.ts`

Expected: all completion, concurrency, and undo tests PASS.

```bash
git add miniapp
git commit -m "feat: add transactional lesson completion"
```

## Task 9: Implement per-course subscription preferences and scheduled reminders

**Files:**
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/reminder/index.js`
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/reminder-domain.js`
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/reminder-dispatch/index.js`
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/reminder-dispatch/package.json`
- Create: `miniapp/tests/cloud/reminder.test.ts`
- Create: `miniapp/src/services/reminders.ts`
- Create: `miniapp/src/components/MemberPicker.vue`
- Modify: `miniapp/src/pages/course/edit.vue`

- [ ] **Step 1: Write failing reminder uniqueness tests**

Create `miniapp/tests/cloud/reminder.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import reminderDomain from '../../uniCloud-aliyun/cloudfunctions/common/app-shared/reminder-domain.js'

const { reminderKey, enabledMemberIds } = reminderDomain

describe('reminders', () => {
  it('keys one delivery per lesson, member, and reminder time', () => {
    const key = reminderKey('lesson-1', 'member-2', '2026-07-18T09:00:00+08:00')
    expect(key).toBe('lesson-1:member-2:2026-07-18T09:00:00+08:00')
  })

  it('does not include disabled members', () => {
    const members = [{ id: 'm1', enabled: true }, { id: 'm2', enabled: false }]
    expect(enabledMemberIds(members)).toEqual(['m1'])
  })
})
```

- [ ] **Step 2: Run reminder tests and verify failure**

Run: `npm --prefix miniapp test -- tests/cloud/reminder.test.ts`

Expected: FAIL because `reminder-domain.js` does not exist.

- [ ] **Step 3: Implement pure reminder rules**

Create `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/reminder-domain.js`:

```js
'use strict'

function reminderKey(lessonId, memberId, remindAt) {
  return `${lessonId}:${memberId}:${remindAt}`
}

function enabledMemberIds(members) {
  return members.filter((member) => member.enabled).map((member) => member.id)
}

function assertReminderOffset(minutes) {
  if (!Number.isInteger(minutes) || minutes < 10 || minutes > 7 * 24 * 60 || minutes % 10 !== 0) {
    throw new Error('INVALID_REMINDER_OFFSET')
  }
}

module.exports = { reminderKey, enabledMemberIds, assertReminderOffset }
```

- [ ] **Step 4: Implement preference and subscription methods**

`reminder/index.js` exposes `getCoursePreferences`, `setCoursePreferences`, and `recordSubscriptionResult`. Validate reminder offsets are between 10 minutes and 7 days and divisible by 10 minutes.

Client `requestSubscription` calls `uni.requestSubscribeMessage` only after a visible user tap, records `accept`, `reject`, or `ban`, and never claims that a rejected subscription will still deliver.

- [ ] **Step 5: Implement the scheduled dispatcher**

Create `reminder-dispatch/package.json`:

```json
{
  "name": "reminder-dispatch",
  "version": "1.0.0",
  "main": "index.js",
  "cloudfunction-config": {
    "memorySize": 256,
    "timeout": 60,
    "triggers": [
      {
        "name": "dispatch-every-ten-minutes",
        "type": "timer",
        "config": "0 */10 * * * * *"
      }
    ]
  }
}
```

The dispatcher claims pending jobs by unique key, sends only to enabled and authorized members, records `sent` or `failed`, and does not retry permanent authorization failures.

- [ ] **Step 6: Verify and commit**

Run:

```bash
npm --prefix miniapp test -- tests/cloud/reminder.test.ts
npm --prefix miniapp run typecheck
```

Expected: PASS.

```bash
git add miniapp
git commit -m "feat: add per-course lesson reminders"
```

## Task 10: Implement learning records, drafts, attachments, and timeline

**Files:**
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/learning/index.js`
- Create: `miniapp/tests/cloud/learning.test.ts`
- Create: `miniapp/src/services/learning.ts`
- Create: `miniapp/src/stores/learning.ts`
- Create: `miniapp/src/components/UploadQueue.vue`
- Create: `miniapp/src/components/LearningRecordCard.vue`
- Create: `miniapp/src/pages/learning/index.vue`
- Create: `miniapp/src/pages/learning/edit.vue`

- [ ] **Step 1: Write failing attachment-policy tests**

Create `miniapp/tests/cloud/learning.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validateAttachment } from '../../src/domain/quota'

describe('learning attachments', () => {
  it('accepts a 30MB one-minute clip', () => {
    expect(() => validateAttachment('video', 30 * 1024 * 1024, 60)).not.toThrow()
  })

  it('rejects a PDF above 10MB', () => {
    expect(() => validateAttachment('pdf', 11 * 1024 * 1024)).toThrow('PDF_TOO_LARGE')
  })
})
```

- [ ] **Step 2: Implement record and attachment methods**

`learning/index.js` exposes these contracts:

| Method | Authorization | Required behavior | Return value |
| --- | --- | --- | --- |
| `list({ familyId, courseId, cursor, limit })` | active member | cap limit at 30, filter optional course, exclude recycled records, newest first | `{ records, nextCursor }` |
| `detail({ familyId, recordId })` | active member | return record plus non-deleted attachments | `{ record, attachments }` |
| `save({ familyId, record, requestId })` | owner/admin | validate course/lesson belong to family; create or version-update text and links | `{ record }` |
| `prepareUpload(input)` | owner/admin | repeat kind/size/duration validation and quota check | `{ uploadAllowed: true }` |
| `confirmUpload(input)` | owner/admin | validate cloud file metadata and attach it to the record idempotently | `{ attachment }` |
| `signedFileUrl({ familyId, attachmentId })` | active member | authorize current membership and return a ten-minute URL | `{ url, expiresAt }` |
| `moveToRecycleBin({ familyId, recordId, requestId })` | owner/admin | mark record/attachments deleted and create a 30-day recycle snapshot | `{ purgeAt }` |

The server repeats every file validation and quota check; it never trusts client metadata or returns permanent public file URLs.

- [ ] **Step 3: Build local drafts and upload queue**

Use a key shaped as `learning-draft:{familyId}:{lessonId}` in `uni.setStorageSync`. Save text on every form change with a 500ms debounce. `UploadQueue.vue` manages independent statuses `queued`, `compressing`, `uploading`, `failed`, and `done`; a failed file never clears the text draft.

- [ ] **Step 4: Build the timeline**

`learning/index.vue` loads records newest-first and filters by course. `LearningRecordCard.vue` renders title, notes, tags, short media, PDF, and external cloud-drive link without exposing permanent uniCloud file URLs.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm --prefix miniapp test -- tests/cloud/learning.test.ts src/domain/quota.test.ts
npm --prefix miniapp run typecheck
```

Expected: PASS.

```bash
git add miniapp
git commit -m "feat: add English learning timeline"
```

## Task 11: Implement quota status, recycle bin, export, and family audit page

**Files:**
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/data-export/index.js`
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/export-domain.js`
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/maintenance/index.js`
- Create: `miniapp/uniCloud-aliyun/cloudfunctions/maintenance/package.json`
- Create: `miniapp/tests/cloud/export.test.ts`
- Create: `miniapp/src/services/exports.ts`
- Create: `miniapp/src/pages/family/index.vue`
- Modify: `miniapp/uniCloud-aliyun/cloudfunctions/learning/index.js`
- Modify: `miniapp/uniCloud-aliyun/cloudfunctions/family/index.js`

- [ ] **Step 1: Write failing export isolation tests**

Create `miniapp/tests/cloud/export.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import exportDomain from '../../uniCloud-aliyun/cloudfunctions/common/app-shared/export-domain.js'

const { rowsForFamily, exportExpiresAt } = exportDomain

describe('family export', () => {
  it('contains only the requested family', () => {
    const rows = [{ family_id: 'f1' }, { family_id: 'f2' }]
    expect(rowsForFamily(rows, 'f1')).toEqual([{ family_id: 'f1' }])
  })

  it('uses a short-lived export expiry', () => {
    const now = Date.parse('2026-07-16T10:00:00+08:00')
    expect(exportExpiresAt(now)).toBe(Date.parse('2026-07-16T10:10:00+08:00'))
  })
})
```

- [ ] **Step 2: Run export tests and verify failure**

Run: `npm --prefix miniapp test -- tests/cloud/export.test.ts`

Expected: FAIL because `export-domain.js` does not exist.

- [ ] **Step 3: Implement export isolation rules**

Create `miniapp/uniCloud-aliyun/cloudfunctions/common/app-shared/export-domain.js`:

```js
'use strict'

function rowsForFamily(rows, familyId) {
  return rows.filter((row) => row.family_id === familyId)
}

function exportExpiresAt(now) {
  return now + 10 * 60 * 1000
}

module.exports = { rowsForFamily, exportExpiresAt }
```

- [ ] **Step 4: Implement quota and recycle-bin operations**

Add `quotaStatus`, `listRecycleBin`, and `restoreRecord` methods to the relevant cloud objects. At 80 percent return `warn: true`; at 95 percent reject new attachments with `FILE_QUOTA_BLOCKED` while continuing to allow text records. Records enter recycle bin for 30 days before file deletion.

Create daily `maintenance` logic that purges expired recycle entries, permanently deletes families whose 30-day deletion window ended, deletes expired export files, and creates owner renewal-reminder jobs at 7, 3, and 1 days before `families.renewal_due_at`.

Create `maintenance/package.json`:

```json
{
  "name": "maintenance",
  "version": "1.0.0",
  "main": "index.js",
  "cloudfunction-config": {
    "memorySize": 256,
    "timeout": 600,
    "triggers": [
      {
        "name": "daily-maintenance",
        "type": "timer",
        "config": "0 15 3 * * * *"
      }
    ]
  }
}
```

- [ ] **Step 5: Implement owner-only export**

`data-export/index.js` exposes `createExport({ familyId })` and `exportStatus({ familyId, jobId })`. Export JSON and CSV for all approved collections, plus an attachment manifest and original cloud-drive links. Authorize owner on both creation and download, and expire the result after ten minutes.

- [ ] **Step 6: Complete the family page**

Render members, roles, storage ratio, renewal reminders, export action, recycle bin, and immutable operation log. The delete-family confirmation requires an exact child-name match before calling the server.

- [ ] **Step 7: Verify and commit**

Run:

```bash
npm --prefix miniapp test -- tests/cloud/export.test.ts
npm --prefix miniapp run typecheck
npm --prefix miniapp run build:mp-weixin
```

Expected: PASS and successful WeChat build.

```bash
git add miniapp
git commit -m "feat: add family data safeguards"
```

## Task 12: Add end-to-end verification, deployment documentation, and release checks

**Files:**
- Create: `miniapp/tests/e2e/family-course-flow.test.js`
- Create: `miniapp/jest.config.js`
- Modify: `miniapp/package.json`
- Create: `docs/operations/uniCloud-free-tier-runbook.md`
- Create: `docs/operations/manual-acceptance.md`

- [ ] **Step 1: Add the uni-automator dependency and script**

Run:

```bash
npm --prefix miniapp install --save-dev @dcloudio/uni-automator cross-env jest@27.0.4 jest-environment-node@27.5.1
```

Add to `miniapp/package.json`:

```json
{
  "scripts": {
    "test:e2e:mp-weixin": "cross-env UNI_PLATFORM=mp-weixin jest -i --config jest.config.js"
  }
}
```

Create `miniapp/jest.config.js`:

```js
module.exports = {
  globalSetup: '@dcloudio/uni-automator/dist/setup.js',
  globalTeardown: '@dcloudio/uni-automator/dist/teardown.js',
  testEnvironment: '@dcloudio/uni-automator/dist/environment.js',
  testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
  testTimeout: 30000,
  reporters: ['default'],
}
```

- [ ] **Step 2: Write the core automated journey**

Create a dedicated test family and an “外教口语” course with 8 remaining lessons in the uniCloud test environment. Then create `miniapp/tests/e2e/family-course-flow.test.js` to drive these visible steps with uni-automator:

```js
describe('family course flow', () => {
  it('shows the course-first home page and opens completion confirmation', async () => {
    const page = await program.reLaunch('/pages/home/index')
    const hero = await page.$('[data-testid="course-hero"]')
    expect(await hero.attribute('data-remaining')).toBe('8')
    await (await hero.$('[data-testid="complete-lesson"]')).tap()
    const sheet = await page.$('[data-testid="complete-sheet"]')
    expect(await sheet.text()).toContain('8 → 7')
  })
})
```

Add matching `data-testid` attributes to the home and confirmation components.

- [ ] **Step 3: Write the operations runbook**

`docs/operations/uniCloud-free-tier-runbook.md` must include exact procedures for:

```text
1. Create and bind the Alibaba uniCloud free service space.
2. Import uni-id-pages and uni-open-bridge.
3. Put AppID/secret only in ignored uni-config-center configuration.
4. Upload database schemas and indexes.
5. Upload common modules, cloud objects, and timer trigger.
6. Configure the WeChat subscription template ID.
7. Set 80% and 95% quota alerts.
8. Renew the free service space monthly.
9. Export and restore family data.
10. Roll back cloud objects to the previous tagged release.
```

- [ ] **Step 4: Write manual acceptance scenarios**

`docs/operations/manual-acceptance.md` contains checkboxes for two Android phones and three WeChat roles covering: invite, owner-only promotion, course creation, fixed schedule, one-off reschedule, selected reminder members, simultaneous completion, undo, learning draft recovery, upload failure, 80/95 percent quota, export, member removal, and file-access revocation.

- [ ] **Step 5: Run the full verification suite**

Run:

```bash
npm --prefix miniapp test
npm --prefix miniapp run typecheck
npm --prefix miniapp run build:mp-weixin
npm --prefix miniapp run test:e2e:mp-weixin
git diff --check
```

Expected: unit/integration tests PASS; typecheck and build exit 0; e2e PASS when WeChat Developer Tools CLI is installed and authenticated; `git diff --check` produces no output.

- [ ] **Step 6: Perform the two-device acceptance pass**

Follow every checkbox in `docs/operations/manual-acceptance.md`. Record device models, WeChat versions, test accounts' roles, and any deviation. Do not mark the release ready while any required checkbox is incomplete.

- [ ] **Step 7: Commit**

```bash
git add miniapp docs/operations
git commit -m "test: add miniapp release verification"
```

## Final completion gate

Before claiming the MVP complete:

```bash
git status --short
git log --oneline --decorate -12
npm --prefix miniapp test
npm --prefix miniapp run typecheck
npm --prefix miniapp run build:mp-weixin
```

Expected: clean worktree; each task has its own commit; all tests and build pass. Then run `superpowers:requesting-code-review`, address verified findings, and use `superpowers:verification-before-completion` before any final success claim.

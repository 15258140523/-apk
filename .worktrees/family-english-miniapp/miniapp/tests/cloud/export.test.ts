import { describe, expect, it } from 'vitest'
import exportDomain from '../../uniCloud-aliyun/cloudfunctions/common/app-shared/export-domain.js'

const { rowsForFamily, exportExpiresAt } = exportDomain

describe('family export', () => {
  it('contains only the requested family', () => {
    const rows = [{ family_id: 'f1' }, { family_id: 'f2' }]
    expect(rowsForFamily(rows, 'f1')).toEqual([{ family_id: 'f1' }])
  })

  it('returns empty when no matching rows', () => {
    expect(rowsForFamily([{ family_id: 'f2' }], 'f1')).toEqual([])
  })

  it('uses a short-lived export expiry', () => {
    const now = Date.parse('2026-07-16T10:00:00+08:00')
    expect(exportExpiresAt(now)).toBe(Date.parse('2026-07-16T10:10:00+08:00'))
  })
})

import exportCloud from '../../uniCloud-aliyun/cloudfunctions/data-export/index.obj.js'

describe('data-export cloud object exports', () => {
  it('exports all required methods', () => {
    expect(typeof exportCloud._before).toBe('function')
    expect(typeof exportCloud.createExport).toBe('function')
    expect(typeof exportCloud.exportStatus).toBe('function')
  })
})

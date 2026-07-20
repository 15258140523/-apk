import { describe, expect, it } from 'vitest'
import { weeklyOccurrences } from './schedule'

describe('weeklyOccurrences', () => {
  it('creates Saturdays inside the requested window', () => {
    expect(
      weeklyOccurrences(
        { weekday: 6, hour: 10, minute: 0 },
        '2026-07-01',
        '2026-07-20',
      ),
    ).toEqual([
      '2026-07-04T10:00:00+08:00',
      '2026-07-11T10:00:00+08:00',
      '2026-07-18T10:00:00+08:00',
    ])
  })
})

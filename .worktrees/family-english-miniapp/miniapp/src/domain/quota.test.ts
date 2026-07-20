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

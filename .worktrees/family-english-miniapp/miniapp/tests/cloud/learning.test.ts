import { describe, expect, it } from 'vitest'
import { validateAttachment } from '../../src/domain/quota'

describe('learning attachments', () => {
  it('accepts a 30MB one-minute clip', () => {
    expect(() => validateAttachment('video', 30 * 1024 * 1024, 60)).not.toThrow()
  })

  it('rejects a PDF above 10MB', () => {
    expect(() => validateAttachment('pdf', 11 * 1024 * 1024)).toThrow('PDF_TOO_LARGE')
  })

  it('rejects a video over 1 minute', () => {
    expect(() => validateAttachment('video', 20 * 1024 * 1024, 61)).toThrow('VIDEO_TOO_LONG')
  })

  it('accepts an image without duration check', () => {
    expect(() => validateAttachment('image', 5 * 1024 * 1024)).not.toThrow()
  })
})

import learningCloud from '../../uniCloud-aliyun/cloudfunctions/learning/index.obj.js'

describe('learning cloud object exports', () => {
  it('exports all required methods', () => {
    expect(typeof learningCloud._before).toBe('function')
    expect(typeof learningCloud.list).toBe('function')
    expect(typeof learningCloud.detail).toBe('function')
    expect(typeof learningCloud.save).toBe('function')
    expect(typeof learningCloud.prepareUpload).toBe('function')
    expect(typeof learningCloud.confirmUpload).toBe('function')
    expect(typeof learningCloud.signedFileUrl).toBe('function')
    expect(typeof learningCloud.moveToRecycleBin).toBe('function')
  })
})

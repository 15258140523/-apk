import { describe, expect, it } from 'vitest'
import { APP_NAME } from './model'

describe('project', () => {
  it('has the approved product name', () => {
    expect(APP_NAME).toBe('英语学习账本')
  })
})

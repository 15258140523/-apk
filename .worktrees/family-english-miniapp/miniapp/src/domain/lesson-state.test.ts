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

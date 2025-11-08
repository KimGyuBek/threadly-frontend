import { describe, expect, it } from 'vitest'

import { toFeedResponse } from './postMapper'

const basePost = {
  postId: 'post-1',
  userId: 'user-1',
  content: 'hello world',
  viewCount: 10,
  status: 'ACTIVE',
  postedAt: '2024-01-01T00:00:00',
}

describe('toFeedResponse', () => {
  it('parses cursorTimestamp/cursorId and marks hasNext correctly', () => {
    const response = toFeedResponse({
      success: true,
      data: {
        content: [basePost],
        nextCursor: {
          cursorTimestamp: '2024-01-01T00:00:00',
          cursorId: 'cursor-1',
        },
      },
    })

    expect(response.hasNext).toBe(true)
    expect(response.nextCursor).toEqual({ timestamp: '2024-01-01T00:00:00', id: 'cursor-1' })
  })

  it('returns hasNext=false when cursor fields are missing', () => {
    const response = toFeedResponse({
      success: true,
      data: {
        content: [basePost],
        nextCursor: {
          cursorTimestamp: null,
          cursorId: null,
        },
      },
    })

    expect(response.hasNext).toBe(false)
    expect(response.nextCursor).toBeUndefined()
  })
})

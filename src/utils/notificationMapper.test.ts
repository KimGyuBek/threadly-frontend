import { describe, expect, it } from 'vitest'

import { toNotificationListResponse } from './notificationMapper'

describe('toNotificationListResponse', () => {
  const notification = {
    eventId: 'event-1',
    receiverId: 'user-1',
    notificationType: 'POST_LIKE',
    occurredAt: '2024-01-01T00:00:00',
    isRead: false,
    actorProfile: {
      userId: 'actor-1',
      nickname: 'Actor',
      profileImageUrl: null,
    },
    metadata: {
      type: 'POST_LIKE',
      postId: 'post-1',
    },
  }

  it('normalizes cursor fields with cursorTimestamp/cursorId', () => {
    const response = toNotificationListResponse({
      success: true,
      data: {
        items: [notification],
        nextCursor: {
          cursorTimestamp: '2024-01-02T00:00:00',
          cursorId: 'event-2',
        },
      },
    })

    expect(response.hasNext).toBe(true)
    expect(response.nextCursor).toEqual({ timestamp: '2024-01-02T00:00:00', id: 'event-2' })
  })

  it('marks hasNext=false when cursor is empty', () => {
    const response = toNotificationListResponse({
      success: true,
      data: {
        items: [notification],
        nextCursor: {
          cursorTimestamp: null,
          cursorId: null,
        },
      },
    })

    expect(response.hasNext).toBe(false)
    expect(response.nextCursor).toBeNull()
  })
})

export interface NormalizedCursor {
  timestamp: string;
  id: string;
}

const toOptionalString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return value.toString();
};

/**
 * Extracts a cursor object from various cursor-shaped payloads.
 */
export const extractCursor = (raw: unknown): NormalizedCursor | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const timestampValue =
    data['timestamp'] ?? data['cursorTimestamp'] ?? data['cursor_timestamp'] ?? null;
  const idValue = data['id'] ?? data['cursorId'] ?? data['cursor_id'] ?? null;

  const timestamp = toOptionalString(timestampValue);
  const id = toOptionalString(idValue);

  if (timestamp && id) {
    return { timestamp, id };
  }

  return null;
};

export const hasMoreFromCursor = (cursor: NormalizedCursor | null | undefined): boolean => {
  return Boolean(cursor?.timestamp && cursor?.id);
};

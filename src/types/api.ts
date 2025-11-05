export interface ThreadlyResponse<T> {
  success: boolean;
  code: string;
  message: string;
  data: T;
  timestamp?: string;
}

export type AnyRecord = Record<string, unknown>;

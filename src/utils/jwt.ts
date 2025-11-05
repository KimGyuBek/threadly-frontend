export interface JwtPayload {
  userId?: string;
  userType?: string;
  userStatusType?: string;
  [key: string]: unknown;
}

export const decodeJwt = (token: string): JwtPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      return null;
    }
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    const json = decodeURIComponent(
      decoded
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
    return JSON.parse(json) as JwtPayload;
  } catch (error) {
    console.warn('JWT decode failed', error);
    return null;
  }
};

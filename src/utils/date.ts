import { formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';

export const formatRelativeTime = (isoDate?: string | null): string => {
  if (!isoDate) {
    return '';
  }
  try {
    const date = parseISO(isoDate);
    if (!isValid(date)) {
      return '';
    }
    return formatDistanceToNowStrict(date, { addSuffix: true });
  } catch (error) {
    console.warn('formatRelativeTime parse error', error);
    return '';
  }
};

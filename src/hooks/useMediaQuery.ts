import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 720px)';

export const useMediaQuery = (query: string): boolean => {
  const getMatches = () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => {
        mediaQuery.removeEventListener('change', handler);
      };
    }
    mediaQuery.addListener(handler);
    return () => {
      mediaQuery.removeListener(handler);
    };
  }, [query]);

  return matches;
};

export const useIsMobile = (): boolean => useMediaQuery(MOBILE_QUERY);
